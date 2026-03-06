<script setup lang="ts">
import type { UIMessage } from 'ai';
import { marked } from 'marked';

defineProps<{
  message: UIMessage;
}>();

const renderMarkdown = (content: string): string => {
  return marked.parse(content, { async: false }) as string;
};

const getMessageText = (message: UIMessage): string => {
  return message.parts
    .filter((p): p is Extract<typeof p, { type: 'text' }> => p.type === 'text')
    .map(p => p.text)
    .join('');
};
</script>

<template>
  <div
    :class="[
      'flex gap-2',
      message.role === 'user' ? 'justify-end' : 'justify-start',
    ]"
  >
    <!-- AI avatar -->
    <div
      v-if="message.role === 'assistant'"
      class="shrink-0 size-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5"
    >
      <Icon name="hugeicons:ai-chat-02" class="size-3.5 text-primary" />
    </div>

    <div
      :class="[
        'max-w-[85%] rounded-lg px-3 py-2 text-sm',
        message.role === 'user'
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted',
      ]"
    >
      <!-- User message -->
      <template v-if="message.role === 'user'">
        <template v-for="(part, pIdx) in message.parts" :key="pIdx">
          <span v-if="part.type === 'text'" class="whitespace-pre-wrap">{{
            part.text
          }}</span>
        </template>
      </template>

      <!-- AI message with markdown -->
      <div
        v-else
        class="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-2"
        v-html="renderMarkdown(getMessageText(message))"
      />
    </div>
  </div>
</template>
