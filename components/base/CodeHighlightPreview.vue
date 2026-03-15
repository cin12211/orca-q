<script setup lang="ts">
import { computed, ref } from 'vue';
import { vAutoAnimate } from '@formkit/auto-animate/vue';
import type { DecorationItem } from 'shiki';
import { Button } from '~/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '~/components/ui/tooltip';
import { useCopyToClipboard } from '~/core/composables/useCopyToClipboard';

const props = withDefaults(
  defineProps<{
    /** The source code to highlight */
    code: string;
    /** Language for syntax highlighting */
    language?: SupportedLanguage;
    /** Show a copy-to-clipboard button in the header */
    showCopyButton?: boolean;
    /** CSS max-height value for the scrollable body (e.g. '24rem', '140px') */
    maxHeight?: string;
    /** Shiki decorations for highlighting specific ranges (e.g. errors) */
    decorations?: DecorationItem[];
  }>(),
  {
    language: 'sql',
    showCopyButton: true,
    maxHeight: undefined,
    decorations: () => [],
  }
);

const { highlight } = useCodeHighlighter();

const highlightedCode = computed(() => {
  if (!props.code) return null;
  return highlight(props.code, props.language, {
    decorations: props.decorations,
  });
});

const containerStyle = computed(() => {
  return props.maxHeight
    ? {
        maxHeight: props.maxHeight,
        overflowY: 'auto' as const,
        overflowX: 'auto' as const,
      }
    : {};
});

// Copy state
const { copied, handleCopy, getCopyIcon, getCopyIconClass, getCopyTooltip } =
  useCopyToClipboard();

const onCopy = async () => {
  if (!props.code) return;
  await handleCopy(props.code);
};

const languageLabel = computed(() => props.language.toUpperCase());
</script>

<template>
  <div
    class="rounded-lg border border-border/60 bg-muted/30 overflow-hidden shadow-sm"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between px-3 py-1 border-b border-border/40 bg-muted/50"
    >
      <!-- Language label -->
      <span
        class="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground select-none"
      >
        {{ languageLabel }}
      </span>

      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            v-if="showCopyButton"
            variant="ghost"
            size="xxs"
            @click="onCopy"
          >
            <span class="flex items-center gap-1 justify-center">
              <Icon
                :key="copied ? 'tick' : 'copy'"
                :name="getCopyIcon(copied)"
                class="size-3.5"
                :class="getCopyIconClass(copied)"
              />
              <span
                v-if="copied"
                class="text-[10px] font-medium leading-none"
                :class="getCopyIconClass(copied)"
                >Copied</span
              >
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{{ getCopyTooltip(copied, 'Copy code') }}</p>
        </TooltipContent>
      </Tooltip>
    </div>

    <!-- Code body -->
    <div :style="containerStyle">
      <!-- Highlighted HTML from Shiki -->
      <div
        v-if="highlightedCode"
        class="[&>pre]:p-3 [&>pre]:font-mono [&>pre]:whitespace-pre [&>pre]:leading-relaxed [&>pre]:m-0 [&>pre]:w-fit [&>pre]:min-w-full [&>pre]:rounded-none chat-code-text"
        v-html="highlightedCode"
      />
      <!-- Fallback plain text -->
      <pre
        v-else
        class="p-3 font-mono whitespace-pre leading-relaxed text-foreground/80 m-0 w-fit min-w-full chat-code-text"
        >{{ code }}</pre
      >
    </div>
  </div>
</template>
