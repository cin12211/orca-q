import { computed, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { useAgentRenderer } from '~/components/modules/agent/hooks/useDbAgentRenderer';
import type { DbAgentMessage } from '~/components/modules/agent/types';

describe('useAgentRenderer', () => {
  it('splits text into markdown and code blocks', () => {
    const messages = ref<DbAgentMessage[]>([
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: '## Summary\n\n```sql\nSELECT 1\n```',
          },
        ],
      } as DbAgentMessage,
    ]);

    const { renderedMessages } = useAgentRenderer(
      computed(() => messages.value)
    );

    expect(renderedMessages.value).toHaveLength(1);
    expect(renderedMessages.value[0]?.blocks).toEqual([
      {
        kind: 'markdown',
        content: '## Summary',
      },
      {
        kind: 'code',
        language: 'sql',
        code: 'SELECT 1',
      },
    ]);
  });

  it('maps tool states into loading, approval, and tool blocks', () => {
    const messages = ref<DbAgentMessage[]>([
      {
        id: 'assistant-2',
        role: 'assistant',
        parts: [
          {
            type: 'tool-generate_query',
            state: 'input-available',
            toolCallId: 'tool-1',
            input: {
              prompt: 'Count users',
              schema: 'Schema: public',
              dialect: 'postgresql',
            },
          },
          {
            type: 'tool-render_table',
            state: 'approval-requested',
            toolCallId: 'tool-2',
            input: {
              sql: 'DELETE FROM sessions',
              limit: 100,
            },
            approval: {
              id: 'approval-1',
            },
          },
          {
            type: 'tool-describe_table',
            state: 'output-available',
            toolCallId: 'tool-3',
            output: {
              tableName: 'users',
              summary: 'Table users stores user records.',
              columns: [],
              relatedTables: [],
            },
          },
          {
            type: 'tool-export_file',
            state: 'output-available',
            toolCallId: 'tool-5',
            output: {
              filename: 'users.csv',
              mimeType: 'text/csv;charset=utf-8',
              content: 'id,name\n1,Ada',
              format: 'csv',
              encoding: 'utf8',
              fileSize: 13,
              preview: {
                columns: ['id', 'name'],
                rows: [{ id: 1, name: 'Ada' }],
                truncated: false,
              },
            },
          },
        ],
      } as DbAgentMessage,
    ]);

    const { renderedMessages, hasMutationPending, getComponent } =
      useAgentRenderer(computed(() => messages.value));

    expect(renderedMessages.value[0]?.blocks).toEqual([
      {
        kind: 'loading',
        toolName: 'generate_query',
        toolCallId: 'tool-1',
        label: 'Generating query...',
      },
      {
        kind: 'approval',
        toolName: 'render_table',
        toolCallId: 'tool-2',
        input: {
          sql: 'DELETE FROM sessions',
          limit: 100,
        },
        approvalId: 'approval-1',
      },
      {
        kind: 'tool',
        toolName: 'describe_table',
        toolCallId: 'tool-3',
        result: {
          tableName: 'users',
          summary: 'Table users stores user records.',
          columns: [],
          relatedTables: [],
        },
      },
      {
        kind: 'tool',
        toolName: 'export_file',
        toolCallId: 'tool-5',
        result: {
          filename: 'users.csv',
          mimeType: 'text/csv;charset=utf-8',
          content: 'id,name\n1,Ada',
          format: 'csv',
          encoding: 'utf8',
          fileSize: 13,
          preview: {
            columns: ['id', 'name'],
            rows: [{ id: 1, name: 'Ada' }],
            truncated: false,
          },
        },
      },
    ]);

    expect(hasMutationPending.value).toBe(true);
    expect(getComponent('describe_table')).toBe('AgentDescribeBlock');
    expect(getComponent('export_file')).toBe('AgentExportFileBlock');
  });

  it('maps reasoning and streaming text parts', () => {
    const messages = ref<DbAgentMessage[]>([
      {
        id: 'assistant-3',
        role: 'assistant',
        parts: [
          {
            type: 'reasoning',
            text: 'Inspecting schema relationships.\nValidating filters.',
            state: 'streaming',
          },
          {
            type: 'text',
            text: 'Working through the result',
            state: 'streaming',
          },
        ],
      } as DbAgentMessage,
    ]);

    const { renderedMessages } = useAgentRenderer(
      computed(() => messages.value)
    );

    expect(renderedMessages.value[0]?.blocks).toEqual([
      {
        kind: 'reasoning',
        content: 'Inspecting schema relationships.\nValidating filters.',
        isStreaming: true,
      },
      {
        kind: 'text',
        content: 'Working through the result',
        isStreaming: true,
      },
    ]);
  });
});
