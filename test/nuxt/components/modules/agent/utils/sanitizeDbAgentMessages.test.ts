import { describe, expect, it } from 'vitest';
import type { DbAgentMessage } from '~/components/modules/agent/types';
import {
  hasIncompleteDbAgentMessages,
  sanitizeDbAgentMessages,
} from '~/components/modules/agent/utils/sanitizeDbAgentMessages';

describe('sanitizeDbAgentMessages', () => {
  it('drops incomplete tool calls and trailing dependent messages', () => {
    const messages = [
      {
        id: 'user-1',
        role: 'user',
        parts: [{ type: 'text', text: 'Analyze the schema' }],
      },
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [
          { type: 'reasoning', text: 'Checking tables.', state: 'done' },
          {
            type: 'tool-describe_table',
            state: 'input-available',
            toolCallId: 'call-1',
            input: { tableName: 'users' },
          },
          {
            type: 'text',
            text: 'This partial text should be removed.',
            state: 'streaming',
          },
        ],
      },
      {
        id: 'assistant-2',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Dependent follow-up' }],
      },
    ] as DbAgentMessage[];

    expect(sanitizeDbAgentMessages(messages)).toEqual([
      messages[0],
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [{ type: 'reasoning', text: 'Checking tables.', state: 'done' }],
      },
    ]);
    expect(hasIncompleteDbAgentMessages(messages)).toBe(true);
  });

  it('keeps approval and completed tool outputs intact', () => {
    const messages = [
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [
          {
            type: 'tool-render_table',
            state: 'approval-requested',
            toolCallId: 'call-1',
            input: { sql: 'DELETE FROM sessions', limit: 100 },
            approval: { id: 'approval-1' },
          },
          {
            type: 'tool-describe_table',
            state: 'output-available',
            toolCallId: 'call-2',
            output: {
              tableName: 'users',
              summary: 'Users table',
              columns: [],
              relatedTables: [],
            },
          },
        ],
      },
    ] as DbAgentMessage[];

    expect(sanitizeDbAgentMessages(messages)).toEqual(messages);
    expect(hasIncompleteDbAgentMessages(messages)).toBe(false);
  });
});
