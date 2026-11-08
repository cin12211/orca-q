import { describe, expect, it } from 'vitest';

/**
 * Test the filterLargeToolOutputs logic from agent.ts
 * Recreated here since it's a private function in the API handler
 */
const LARGE_OUTPUT_TOOL_NAMES = new Set([
  'export_query_result',
  'export_content',
  'render_table',
]);

function filterLargeToolOutputs(messages: any[]): any[] {
  return messages.map(message => {
    if (message.role !== 'assistant' || !Array.isArray(message.parts)) {
      return message;
    }

    const filteredParts = message.parts.map((part: any) => {
      const toolName = String(part.type || '').replace(/^tool-/, '');

      if (
        !LARGE_OUTPUT_TOOL_NAMES.has(toolName) ||
        part.state !== 'output-available' ||
        !part.output
      ) {
        return part;
      }

      if (toolName === 'export_query_result' || toolName === 'export_content') {
        return {
          ...part,
          output: {
            filename: part.output.filename,
            format: part.output.format,
            fileSize: part.output.fileSize,
            mimeType: part.output.mimeType,
            content: '[exported — content omitted from context]',
            encoding: part.output.encoding,
            preview: { columns: [], rows: [], truncated: true },
          },
        };
      }

      if (toolName === 'render_table') {
        return {
          ...part,
          output: {
            sql: part.output.sql,
            columns: part.output.columns,
            rows: [],
            rowCount: part.output.rowCount,
            truncated: true,
          },
        };
      }

      return part;
    });

    return { ...message, parts: filteredParts };
  });
}

describe('filterLargeToolOutputs', () => {
  it('does not modify user messages', () => {
    const messages = [
      { role: 'user', parts: [{ type: 'text', text: 'hello' }] },
    ];
    const result = filterLargeToolOutputs(messages);
    expect(result).toEqual(messages);
  });

  it('strips content from export_query_result outputs', () => {
    const messages = [
      {
        role: 'assistant',
        parts: [
          {
            type: 'tool-export_query_result',
            state: 'output-available',
            output: {
              filename: 'users.csv',
              format: 'csv',
              fileSize: 50000,
              mimeType: 'text/csv',
              content: 'id,name\n1,Alice\n2,Bob\n...',
              encoding: 'utf8',
              preview: {
                columns: ['id', 'name'],
                rows: [{ id: 1, name: 'Alice' }],
                truncated: false,
              },
            },
          },
        ],
      },
    ];

    const result = filterLargeToolOutputs(messages);
    const output = result[0].parts[0].output;
    expect(output.filename).toBe('users.csv');
    expect(output.content).toBe('[exported — content omitted from context]');
    expect(output.preview.rows).toEqual([]);
    expect(output.fileSize).toBe(50000);
  });

  it('strips rows from render_table outputs', () => {
    const messages = [
      {
        role: 'assistant',
        parts: [
          {
            type: 'tool-render_table',
            state: 'output-available',
            output: {
              sql: 'SELECT * FROM users',
              columns: [
                { name: 'id', type: 'int' },
                { name: 'name', type: 'varchar' },
              ],
              rows: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
              ],
              rowCount: 2,
              truncated: false,
            },
          },
        ],
      },
    ];

    const result = filterLargeToolOutputs(messages);
    const output = result[0].parts[0].output;
    expect(output.sql).toBe('SELECT * FROM users');
    expect(output.columns).toHaveLength(2);
    expect(output.rows).toEqual([]);
    expect(output.rowCount).toBe(2);
    expect(output.truncated).toBe(true);
  });

  it('does not strip non-output-available parts', () => {
    const messages = [
      {
        role: 'assistant',
        parts: [
          {
            type: 'tool-render_table',
            state: 'input-streaming',
            output: null,
          },
        ],
      },
    ];

    const result = filterLargeToolOutputs(messages);
    expect(result[0].parts[0].state).toBe('input-streaming');
    expect(result[0].parts[0].output).toBeNull();
  });

  it('preserves non-export tool outputs', () => {
    const generateQueryOutput = {
      sql: 'SELECT * FROM users',
      isMutation: false,
      explanation: 'Lists all users',
    };

    const messages = [
      {
        role: 'assistant',
        parts: [
          {
            type: 'tool-generate_query',
            state: 'output-available',
            output: generateQueryOutput,
          },
        ],
      },
    ];

    const result = filterLargeToolOutputs(messages);
    expect(result[0].parts[0].output).toEqual(generateQueryOutput);
  });

  it('handles mixed parts in a single message', () => {
    const messages = [
      {
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Here are the results:' },
          {
            type: 'tool-render_table',
            state: 'output-available',
            output: {
              sql: 'SELECT 1',
              columns: [{ name: 'one', type: 'int' }],
              rows: [{ one: 1 }],
              rowCount: 1,
              truncated: false,
            },
          },
          {
            type: 'tool-export_content',
            state: 'output-available',
            output: {
              filename: 'report.md',
              format: 'markdown',
              fileSize: 1000,
              mimeType: 'text/markdown',
              content: '# Report\nLong content here...',
              encoding: 'utf8',
              preview: { columns: [], rows: [], truncated: false },
            },
          },
        ],
      },
    ];

    const result = filterLargeToolOutputs(messages);
    // Text part unchanged
    expect(result[0].parts[0].text).toBe('Here are the results:');
    // render_table rows stripped
    expect(result[0].parts[1].output.rows).toEqual([]);
    // export_content content stripped
    expect(result[0].parts[2].output.content).toContain('omitted');
  });
});
