<script setup lang="ts">
import type { Component } from 'vue';
import { useCopyToClipboard } from '~/core/composables/useCopyToClipboard';
import type { AgentRenderedMessage, DbAgentToolName } from '../types';
import {
  BlockMessageText,
  BlockMessageMarkdown,
  BlockMessageCode,
  BlockMessageLoading,
  BlockMessageError,
  BlockMessageTool,
} from './block-message';
import { AgentApprovalBlock, AgentReasoningBlock } from './tool-message';

const props = defineProps<{
  message: AgentRenderedMessage;
  getToolComponent: (toolName: DbAgentToolName) => Component | null;
  showReasoning: boolean;
  isStreaming: boolean;
}>();

const emit = defineEmits<{
  approval: [approvalId: string, approved: boolean];
  edit: [text: string];
}>();

const {
  handleCopyWithKey,
  isCopied,
  getCopyIcon,
  getCopyIconClass,
  getCopyTooltip,
} = useCopyToClipboard();

const isUserMessage = computed(() => props.message.role === 'user');

const messageText = computed(() => {
  return (props.message.blocks ?? [])
    .map(b => {
      if (b.kind === 'text' || b.kind === 'markdown') return b.content;
      if (b.kind === 'code') return b.code;
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
  >
    <div
      :class="[
        'flex w-full max-w-3xl gap-3',
        isUserMessage ? 'justify-end' : 'items-start',
      ]"
    >
      <!-- <div
        v-if="!isUserMessage"
        class="mt-1 flex size-8 shrink-0 items-center justify-center rounded-2xl border bg-background/80 text-primary shadow-sm"
      >
        <img src="public/logo.png" class="w-7 rounded-full" />

          <Icon name="hugeicons:ai-chat-02" class="size-4" />  
      </div> -->

      <div class="min-w-0 flex-1 overflow-hidden">
        <!-- TODO hide -->
        <div
          v-if="!isUserMessage && false"
          class="text-xs flex items-center gap-1 font-medium text-muted-foreground"
        >
          <div
            class="flex size-6 shrink-0 items-center justify-center rounded-full border text-primary shadow-sm"
          >
            <img src="public/logo.png" class="size-5 rounded-full" />
          </div>

          <div>Orca</div>
        </div>

        <div
          v-for="(block, index) in message.blocks"
          :key="`${message.id}-${block.kind}-${index}`"
          :class="[
            'overflow-hidden text-xs',
            isUserMessage
              ? 'rounded-xl bg-[#f4f4f4] text-foreground p-2 px-3 shadow-none whitespace-pre-wrap ml-auto'
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
        </div>

        <div
          v-if="!isStreaming"
          class="mt-1 flex items-center gap-1"
          :class="isUserMessage ? 'justify-end' : 'justify-start'"
        >
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                size="iconSm"
                variant="ghost"
                class="p-0 size-4!"
                @click="handleCopyWithKey(message.id, messageText)"
              >
                <Icon
                  :name="getCopyIcon(isCopied(message.id))"
                  :class="['size-3!', getCopyIconClass(isCopied(message.id))]"
                />
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
                class="p-0 size-4!"
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
