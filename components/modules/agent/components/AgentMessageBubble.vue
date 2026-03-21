<script setup lang="ts">
import { computed, type Component } from 'vue';
import { useCopyToClipboard } from '~/core/composables/useCopyToClipboard';
import type { AgentRenderedMessage, DbAgentToolName } from '../types';
import {
  BlockMessageText,
  BlockMessageMarkdown,
  BlockMessageCode,
  BlockMessageMermaid,
  BlockMessageLoading,
  BlockMessageError,
  BlockMessageTool,
  BlockMessageSource,
  BlockMessageQuiz,
} from './block-message';
import { AgentApprovalBlock, AgentReasoningBlock } from './tool-message';

const props = defineProps<{
  message: AgentRenderedMessage;
  getToolComponent: (toolName: DbAgentToolName) => Component | null;
  showReasoning: boolean;
  isStreaming: boolean;
  highlightedResponseId?: string | null;
  registerMessageElement?: (id: string, element: Element | null) => void;
}>();

const emit = defineEmits<{
  approval: [approvalId: string, approved: boolean];
  edit: [text: string];
  'quiz-submit': [text: string];
}>();

const {
  handleCopyWithKey,
  isCopied,
  getCopyIcon,
  getCopyIconClass,
  getCopyTooltip,
} = useCopyToClipboard();

const isUserMessage = computed(() => props.message.role === 'user');

const registerMessageContainer = (element: Element | null) => {
  if (isUserMessage.value || !props.registerMessageElement) {
    return;
  }

  props.registerMessageElement(props.message.id, element);
};

const messageText = computed(() => {
  return (props.message.blocks ?? [])
    .map(b => {
      if (b.kind === 'text' || b.kind === 'markdown') return b.content;
      if (b.kind === 'code') return b.code;
      if (b.kind === 'mermaid') return b.code;
      return '';
    })
    .filter(Boolean)
    .join('\n\n');
});
</script>

<template>
  <div
    :class="[
      'w-full',
      isUserMessage ? 'flex justify-end' : 'flex justify-start',
    ]"
    :ref="element => registerMessageContainer(element as Element | null)"
  >
    <div
      :class="[
        'flex w-full max-w-3xl gap-3',
        isUserMessage ? 'justify-end' : 'items-start',
      ]"
    >
      <div class="min-w-0 flex-1 overflow-hidden">
        <div
          v-for="(block, index) in message.blocks"
          :key="`${message.id}-${block.kind}-${index}`"
          :class="[
            'overflow-hidden chat-text',
            !isUserMessage && props.highlightedResponseId === message.id
              ? 'ring-1 ring-primary/25 bg-primary/6'
              : '',
            isUserMessage
              ? 'rounded-xl bg-muted text-foreground p-2 px-3 shadow-none whitespace-pre-wrap ml-auto'
              : 'rounded-xl border-none bg-transparent py-2 shadow-none flex flex-col gap-1.5',
          ]"
        >
          <BlockMessageText
            v-if="block.kind === 'text'"
            :content="block.content"
            :is-block-streaming="block.isStreaming"
            :is-streaming="isStreaming"
            :is-user-message="isUserMessage"
          />

          <AgentReasoningBlock
            v-else-if="block.kind === 'reasoning' && showReasoning"
            :content="block.content"
            :is-streaming="block.isStreaming"
          />

          <BlockMessageMarkdown
            v-else-if="block.kind === 'markdown'"
            :content="block.content"
            :is-block-streaming="block.isStreaming"
            :is-streaming="isStreaming"
            :is-user-message="isUserMessage"
          />

          <BlockMessageCode
            v-else-if="block.kind === 'code'"
            :id="`${message.id}-${index}`"
            :code="block.code"
            :language="block.language || 'text'"
            :is-block-streaming="block.isStreaming"
            :is-streaming="isStreaming"
          />

          <BlockMessageMermaid
            v-else-if="block.kind === 'mermaid'"
            :id="`${message.id}-${index}`"
            :code="block.code"
          />

          <BlockMessageLoading
            v-else-if="block.kind === 'loading'"
            :label="block.label"
          />

          <BlockMessageError
            v-else-if="block.kind === 'error'"
            :message="block.message"
          />

          <BlockMessageTool
            v-else-if="block.kind === 'tool'"
            :tool-name="block.toolName"
            :result="block.result"
            :get-tool-component="getToolComponent"
          />

          <AgentApprovalBlock
            v-else-if="block.kind === 'approval'"
            :tool-name="block.toolName"
            :input="block.input"
            :approval-id="block.approvalId"
            @approve="emit('approval', $event, true)"
            @deny="emit('approval', $event, false)"
          />

          <BlockMessageSource
            v-else-if="block.kind === 'source'"
            :source-id="block.sourceId"
            :url="block.url"
            :title="block.title"
            :media-type="block.mediaType"
            :filename="block.filename"
          />

          <BlockMessageQuiz
            v-else-if="block.kind === 'quiz'"
            :tool-call-id="block.toolCallId"
            :context="block.context"
            :questions="block.questions"
            @submit="emit('quiz-submit', $event)"
          />
        </div>

        <div
          v-if="!isStreaming"
          class="mt-1 flex items-center gap-1"
          :class="isUserMessage ? 'justify-end' : 'justify-start'"
        >
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                size="xxs"
                variant="ghost"
                class="h-4!"
                @click="handleCopyWithKey(message.id, messageText)"
              >
                <span class="flex items-center gap-1 justify-center">
                  <Icon
                    :name="getCopyIcon(isCopied(message.id))"
                    class="size-3.5!"
                    :class="getCopyIconClass(isCopied(message.id))"
                  />
                  <span
                    v-if="isCopied(message.id)"
                    class="text-[10px] font-medium leading-none"
                    :class="getCopyIconClass(isCopied(message.id))"
                    >Copied</span
                  >
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{{ getCopyTooltip(isCopied(message.id)) }}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip v-if="isUserMessage">
            <TooltipTrigger as-child>
              <Button
                size="iconSm"
                variant="ghost"
                class="size-4!"
                @click="emit('edit', messageText)"
              >
                <Icon name="lucide:pencil" class="size-3!" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Edit</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  </div>
</template>
