<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipTrigger } from '#components';
import { marked } from 'marked';
import { useCopyToClipboard } from '~/core/composables/useCopyToClipboard';
import type {
  AgentRenderedMessage,
  DbAgentToolName,
} from '../db-agent.types';

const props = defineProps<{
  message: AgentRenderedMessage;
  getToolComponent: (toolName: DbAgentToolName) => string | null;
}>();

const emit = defineEmits<{
  approval: [approvalId: string, approved: boolean];
}>();

const { handleCopyWithKey, isCopied, getCopyIcon, getCopyTooltip } =
  useCopyToClipboard();

const renderMarkdown = (content: string) =>
  marked.parse(content, { async: false }) as string;

const stringifyValue = (value: unknown) => JSON.stringify(value, null, 2);

const isUserMessage = computed(() => props.message.role === 'user');
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
        'flex max-w-3xl gap-3',
        isUserMessage ? 'justify-end' : 'items-start',
      ]"
    >
      <div
        v-if="!isUserMessage"
        class="mt-1 flex size-8 shrink-0 items-center justify-center rounded-2xl border bg-background/80 text-primary shadow-sm"
      >
        <Icon name="hugeicons:ai-chat-02" class="size-4" />
      </div>

      <div class="min-w-0 flex-1 space-y-3">
        <div
          v-if="!isUserMessage"
          class="px-1 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
        >
          Agent
        </div>

        <div
          v-for="(block, index) in message.blocks"
          :key="`${message.id}-${block.kind}-${index}`"
          :class="[
            'overflow-hidden',
            isUserMessage
              ? 'rounded-[1.35rem] bg-primary px-4 py-3 text-sm text-primary-foreground shadow-sm'
              : 'rounded-3xl border border-border/70 bg-background/85 px-4 py-3 text-sm shadow-sm backdrop-blur-sm',
          ]"
        >
          <p
            v-if="block.kind === 'text'"
            class="whitespace-pre-wrap leading-7"
          >
            {{ block.content }}
          </p>

          <div
            v-else-if="block.kind === 'markdown'"
            class="prose prose-sm max-w-none prose-p:my-2 prose-pre:my-3 prose-pre:rounded-2xl prose-pre:bg-slate-950 prose-pre:px-4 prose-pre:py-3 prose-pre:text-slate-100 prose-ul:my-2 prose-ol:my-2 prose-headings:mt-4 prose-headings:mb-2 dark:prose-invert"
            v-html="renderMarkdown(block.content)"
          />

          <div v-else-if="block.kind === 'code'" class="overflow-hidden rounded-2xl border bg-slate-950">
            <div
              class="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-300"
            >
              <span>{{ block.language || 'text' }}</span>

              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    variant="ghost"
                    size="xs"
                    class="h-7 rounded-xl px-2 text-slate-200 hover:bg-white/10 hover:text-white"
                    @click="handleCopyWithKey(`${message.id}-${index}`, block.code)"
                  >
                    <Icon
                      :name="getCopyIcon(isCopied(`${message.id}-${index}`))"
                      class="size-3.5"
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{{ getCopyTooltip(isCopied(`${message.id}-${index}`)) }}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <pre class="overflow-x-auto px-4 py-3 text-[13px] leading-6 text-slate-100"><code>{{ block.code }}</code></pre>
          </div>

          <div
            v-else-if="block.kind === 'loading'"
            class="flex items-center gap-2 text-muted-foreground"
          >
            <Icon name="lucide:loader" class="size-4 animate-spin" />
            <span>{{ block.label }}</span>
          </div>

          <div
            v-else-if="block.kind === 'error'"
            class="rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-destructive"
          >
            {{ block.message }}
          </div>

          <div
            v-else-if="block.kind === 'tool' && !getToolComponent(block.toolName)"
            class="rounded-2xl border bg-muted/40"
          >
            <pre class="overflow-x-auto px-3 py-3 text-[12px] leading-6">{{ stringifyValue(block.result) }}</pre>
          </div>

          <component
            :is="getToolComponent(block.toolName)"
            v-else-if="block.kind === 'tool'"
            :data="block.result"
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
      </div>
    </div>
  </div>
</template>
