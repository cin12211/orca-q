import { computed, type ComputedRef } from 'vue';
import type { AgentRenderedMessage, AgentBlock } from '../types';

export type AttachmentType = 'file' | 'code' | 'source';

export interface BaseAttachment {
  id: string;
  type: AttachmentType;
  messageId: string;
}

export interface FileAttachment extends BaseAttachment {
  type: 'file';
  filename: string;
  data: any; // This would depend on what `export_file` returns
}

export interface CodeAttachment extends BaseAttachment {
  type: 'code';
  language: string;
  code: string;
}

export interface SourceAttachment extends BaseAttachment {
  type: 'source';
  url?: string;
  title?: string;
  filename?: string;
  mediaType?: string;
}

export type AgentAttachment =
  | FileAttachment
  | CodeAttachment
  | SourceAttachment;

export function useDbAgentAttachments(
  messages: ComputedRef<AgentRenderedMessage[]>
) {
  const attachments = computed<AgentAttachment[]>(() => {
    const results: AgentAttachment[] = [];

    for (const message of messages.value) {
      if (message.role !== 'assistant') continue;

      const blocks = message.blocks || [];

      blocks.forEach((block, index) => {
        const id = `${message.id}-attachment-${index}`;

        if (block.kind === 'code') {
          results.push({
            id,
            messageId: message.id,
            type: 'code',
            language: block.language,
            code: block.code,
          });
        } else if (block.kind === 'source') {
          results.push({
            id,
            messageId: message.id,
            type: 'source',
            url: block.url,
            title: block.title,
            filename: block.filename,
            mediaType: block.mediaType,
          });
        } else if (block.kind === 'tool' && block.toolName === 'export_file') {
          const result = block.result as any;
          if (result && result.name && result.data) {
            results.push({
              id,
              messageId: message.id,
              type: 'file',
              filename: result.name,
              data: result.data,
            });
          }
        }
      });
    }

    return results;
  });

  const files = computed(() =>
    attachments.value.filter((a): a is FileAttachment => a.type === 'file')
  );

  const codes = computed(() =>
    attachments.value.filter((a): a is CodeAttachment => a.type === 'code')
  );

  const sources = computed(() =>
    attachments.value.filter((a): a is SourceAttachment => a.type === 'source')
  );

  return {
    attachments,
    files,
    codes,
    sources,
  };
}
