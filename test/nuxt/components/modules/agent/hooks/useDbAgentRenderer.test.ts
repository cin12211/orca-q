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
    ]);

    expect(hasMutationPending.value).toBe(true);
    expect(getComponent('describe_table')).toBe('AgentDescribeBlock');
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

  it('preserves reasoning order around tool blocks and merges only adjacent reasoning parts', () => {
    const messages = ref<DbAgentMessage[]>([
      {
        id: 'assistant-4',
        role: 'assistant',
        parts: [
          {
            type: 'reasoning',
            text: 'Inspecting schema.',
            state: 'done',
          },
          {
            type: 'reasoning',
            text: 'Checking relationships.',
            state: 'done',
          },
          {
            type: 'tool-generate_query',
            state: 'input-available',
            toolCallId: 'tool-4',
            input: {
              prompt: 'Count users',
              schema: 'Schema: public',
              dialect: 'postgresql',
            },
          },
          {
            type: 'reasoning',
            text: 'Preparing a concise answer.',
            state: 'streaming',
          },
          {
            type: 'text',
            text: 'Here is the current plan.',
            state: 'done',
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
        content: 'Inspecting schema.\n\nChecking relationships.',
        isStreaming: false,
      },
      {
        kind: 'loading',
        toolName: 'generate_query',
        toolCallId: 'tool-4',
        label: 'Generating query...',
      },
      {
        kind: 'reasoning',
        content: 'Preparing a concise answer.',
        isStreaming: true,
      },
      {
        kind: 'text',
        content: 'Here is the current plan.',
      },
    ]);
  });
});
