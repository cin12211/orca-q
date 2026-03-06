import type { ComputedRef } from 'vue';
import type {
  AgentBlock,
  AgentRenderedMessage,
  DbAgentMessage,
  DbAgentToolName,
} from '../db-agent.types';
import { DB_AGENT_TOOL_NAMES } from '../db-agent.types';

const MARKDOWN_PATTERN =
  /^#{1,6}\s|(\*\*|__).+(\*\*|__)|^[-*]\s|^\d+\.\s|^\|.+\|/m;
const CODE_BLOCK_PATTERN = /```([\w-]*)\n?([\s\S]*?)```/g;

export const TOOL_COMPONENT_MAP: Record<DbAgentToolName, string> = {
  generate_query: 'AgentQueryBlock',
  render_table: 'AgentTableBlock',
  explain_query: 'AgentExplainBlock',
  detect_anomaly: 'AgentAnomalyBlock',
  describe_table: 'AgentDescribeBlock',
};

const TOOL_LOADING_LABELS: Record<DbAgentToolName, string> = {
  generate_query: 'Dang tao query...',
  render_table: 'Dang chay query...',
  explain_query: 'Dang phan tich query...',
  detect_anomaly: 'Dang quet du lieu...',
  describe_table: 'Dang doc schema...',
};

const isDbAgentToolName = (toolName: string): toolName is DbAgentToolName => {
  return DB_AGENT_TOOL_NAMES.includes(toolName as DbAgentToolName);
};

const pushTextBlock = (blocks: AgentBlock[], content: string) => {
  const trimmed = content.trim();
  if (!trimmed) {
    return;
  }

  blocks.push({
    kind: MARKDOWN_PATTERN.test(trimmed) ? 'markdown' : 'text',
    content: trimmed,
  });
};

const textToBlocks = (content: string): AgentBlock[] => {
  const blocks: AgentBlock[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(CODE_BLOCK_PATTERN)) {
    const startIndex = match.index ?? 0;

    pushTextBlock(blocks, content.slice(lastIndex, startIndex));

    blocks.push({
      kind: 'code',
      language: match[1] || 'text',
      code: match[2]?.trimEnd() || '',
    });

    lastIndex = startIndex + match[0].length;
  }

  pushTextBlock(blocks, content.slice(lastIndex));

  return blocks;
};

const toErrorMessage = (part: Record<string, any>) =>
  part.errorText || part.message || part.error || 'Something went wrong.';

const toolPartToBlocks = (part: Record<string, any>): AgentBlock[] => {
  const toolName = String(part.type || '').replace(/^tool-/, '');

  if (!isDbAgentToolName(toolName)) {
    return [];
  }

  if (part.state === 'input-streaming' || part.state === 'input-available') {
    return [
      {
        kind: 'loading',
        toolName,
        toolCallId: part.toolCallId,
        label: TOOL_LOADING_LABELS[toolName],
      },
    ];
  }

  if (part.state === 'approval-requested') {
    return [
      {
        kind: 'approval',
        toolName,
        toolCallId: part.toolCallId,
        input: part.input,
        approvalId: part.approval?.id || part.toolCallId,
      },
    ];
  }

  if (part.state === 'output-available') {
    return [
      {
        kind: 'tool',
        toolName,
        toolCallId: part.toolCallId,
        result: part.output,
      },
    ];
  }

  if (part.state === 'output-error') {
    return [{ kind: 'error', message: toErrorMessage(part) }];
  }

  if (part.state === 'output-denied') {
    return [
      {
        kind: 'error',
        message: 'Execution was denied. No database changes were made.',
      },
    ];
  }

  return [];
};

const partToBlocks = (part: Record<string, any>): AgentBlock[] => {
  if (part.type === 'text') {
    return textToBlocks(part.text || '');
  }

  if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
    return toolPartToBlocks(part);
  }

  if (part.type === 'error') {
    return [{ kind: 'error', message: toErrorMessage(part) }];
  }

  return [];
};

export function useAgentRenderer(messages: ComputedRef<DbAgentMessage[]>) {
  const renderedMessages = computed<AgentRenderedMessage[]>(() =>
    messages.value
      .filter(message => message.role !== 'system')
      .map(message => ({
        id: message.id,
        role: message.role,
        blocks: (message.parts || []).flatMap(part =>
          partToBlocks(part as Record<string, any>)
        ),
      }))
      .filter(message => message.blocks.length > 0)
  );

  const hasMutationPending = computed(() =>
    renderedMessages.value.some(message =>
      message.blocks.some(block => block.kind === 'approval')
    )
  );

  const getComponent = (toolName: DbAgentToolName) =>
    TOOL_COMPONENT_MAP[toolName] || null;

  return {
    renderedMessages,
    hasMutationPending,
    getComponent,
  };
}
