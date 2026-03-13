import type { ComputedRef, Component } from 'vue';
import {
  AgentExportFileBlock,
  AgentQueryBlock,
  AgentTableBlock,
  AgentVisualizeTableBlock,
  AgentExplainBlock,
  AgentAnomalyBlock,
  AgentDescribeBlock,
} from '../components/tool-message';
import type {
  AgentBlock,
  AgentRenderedMessage,
  DbAgentMessage,
  DbAgentToolName,
} from '../types';
import { AgentToolName, DB_AGENT_TOOL_NAMES } from '../types';

const MARKDOWN_PATTERN =
  /^#{1,6}\s|(\*\*|__).+(\*\*|__)|^[-*]\s|^\d+\.\s|^\|.+\|/m;
const CODE_BLOCK_PATTERN = /```([\w-]*)\n?([\s\S]*?)```/g;

export const TOOL_COMPONENT_MAP: Record<DbAgentToolName, Component> = {
  generate_query: AgentQueryBlock,
  render_table: AgentTableBlock,
  visualize_table: AgentVisualizeTableBlock,
  explain_query: AgentExplainBlock,
  detect_anomaly: AgentAnomalyBlock,
  describe_table: AgentDescribeBlock,
  export_query_result: AgentExportFileBlock,
  export_content: AgentExportFileBlock,
};

const TOOL_LOADING_LABELS: Record<DbAgentToolName, string> = {
  generate_query: 'Generating query...',
  render_table: 'Running query...',
  visualize_table: 'Building chart...',
  explain_query: 'Analyzing query...',
  detect_anomaly: 'Scanning data...',
  describe_table: 'Reading schema...',
  export_query_result: 'Fetching & exporting...',
  export_content: 'Preparing export...',
};

const isDbAgentToolName = (toolName: string): toolName is DbAgentToolName => {
  return DB_AGENT_TOOL_NAMES.includes(toolName as DbAgentToolName);
};

const pushTextBlock = (blocks: AgentBlock[], content: string) => {
  const trimmed = content.trim();
  if (!trimmed) return;

  blocks.push({
    kind: MARKDOWN_PATTERN.test(trimmed) ? 'markdown' : 'text',
    content: trimmed,
  });
};

const textToBlocks = (content: string, isStreaming = false): AgentBlock[] => {
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

  if (isStreaming) {
    for (let index = blocks.length - 1; index >= 0; index -= 1) {
      const block = blocks[index];
      if (
        block?.kind === 'text' ||
        block?.kind === 'markdown' ||
        block?.kind === 'code'
      ) {
        block.isStreaming = true;
        break;
      }
    }
  }

  return blocks;
};

const toErrorMessage = (part: Record<string, any>) =>
  part.errorText || part.message || part.error || 'Something went wrong.';

const toolPartToBlocks = (part: Record<string, any>): AgentBlock[] => {
  const toolName = String(part.type || '').replace(/^tool-/, '');

  // askClarification renders as an inline quiz block using part.input (not part.output)
  if (toolName === AgentToolName.AskClarification) {
    if (part.state === 'output-available') {
      return [
        {
          kind: 'quiz',
          toolCallId: String(part.toolCallId || ''),
          context: String(part.input?.context || ''),
          questions: Array.isArray(part.input?.questions)
            ? part.input.questions
            : [],
        },
      ];
    }
    return []; // hide streaming/loading states for this tool
  }

  if (!isDbAgentToolName(toolName)) return [];

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
    return textToBlocks(
      typeof part.text === 'string' ? part.text : '',
      part.state === 'streaming'
    );
  }

  if (part.type === 'reasoning') {
    const content = typeof part.text === 'string' ? part.text.trim() : '';
    if (!content) return [];

    return [
      {
        kind: 'reasoning',
        content,
        isStreaming: part.state === 'streaming',
      },
    ];
  }

  if (part.type === 'source-url') {
    return [
      {
        kind: 'source',
        sourceId: part.sourceId || '',
        url: part.url,
        title: part.title,
      },
    ];
  }

  if (part.type === 'source-document') {
    return [
      {
        kind: 'source',
        sourceId: part.sourceId || '',
        title: part.title,
        mediaType: part.mediaType,
        filename: part.filename,
      },
    ];
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
  const renderedMessages = computed<AgentRenderedMessage[]>(() => {
    const source = messages.value ?? [];
    const result: AgentRenderedMessage[] = [];

    for (let i = 0; i < source.length; i++) {
      const message = source[i];

      if (message.role === 'system') continue;

      const parts = message.parts ?? [];
      const rawBlocks: AgentBlock[] = [];

      for (let j = 0; j < parts.length; j++) {
        const mapped = partToBlocks(parts[j] as Record<string, any>);
        if (mapped?.length) {
          rawBlocks.push(...mapped);
        }
      }

      if (rawBlocks.length === 0) continue;

      const blocks: AgentBlock[] = [];

      for (const block of rawBlocks) {
        const lastBlock = blocks[blocks.length - 1];

        if (block.kind === 'reasoning' && lastBlock?.kind === 'reasoning') {
          const newContent = [lastBlock.content, block.content]
            .filter(Boolean)
            .join('\n\n');

          blocks[blocks.length - 1] = {
            kind: 'reasoning',
            content: newContent,
            isStreaming: lastBlock.isStreaming || block.isStreaming,
          };
        } else {
          blocks.push(block);
        }
      }

      result.push({
        id: message.id,
        role: message.role,
        blocks,
      });
    }

    return result;
  });

  const hasMutationPending = computed(() =>
    renderedMessages.value.some(message =>
      message.blocks.some(block => block.kind === 'approval')
    )
  );

  const getComponent = (toolName: DbAgentToolName): Component | null =>
    TOOL_COMPONENT_MAP[toolName] || null;

  return {
    renderedMessages,
    hasMutationPending,
    getComponent,
  };
}
