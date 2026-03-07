<script setup lang="ts">
import { computed, toRef, ref, watch } from 'vue';
import { Tooltip, TooltipContent, TooltipTrigger } from '#components';
import { ShikiCachedRenderer } from 'shiki-stream/vue';
import type { HighlighterCore } from 'shiki/core';
import { useCopyToClipboard } from '~/core/composables/useCopyToClipboard';
import { useHighlighter } from '~/core/composables/useHighlighter';
import { useSmoothStream } from '~/core/composables/useSmoothStream';

const colorMode = useColorMode();
const highlighter = ref<HighlighterCore | null>(null);

const props = defineProps<{
  id: string;
  code: string;
  language: string;
  class?: string;
  meta?: string;
  isBlockStreaming?: boolean;
  isStreaming?: boolean;
}>();

// Re-create highlighter when language changes (e.g. parser reclassifies mid-stream)
watch(
  () => props.language,
  async language => {
    highlighter.value = await useHighlighter([language]);
  },
  { immediate: true }
);

const { handleCopyWithKey, isCopied, getCopyTooltip } = useCopyToClipboard();

const isCurrentlyStreaming = computed(
  () => !!(props.isBlockStreaming && props.isStreaming)
);

const smoothedCode = useSmoothStream(
  toRef(props, 'code'),
  isCurrentlyStreaming
);

const lang = computed(() => {
  switch (props.language) {
    case 'javascript':
      return 'js';
    case 'typescript':
      return 'ts';
    case 'postgresql':
    case 'mysql':
      return 'sql';
    default:
      return props.language;
  }
});

const trimmedCode = computed(() =>
  smoothedCode.value.trim().replace(/`+$/, '')
);

const key = computed(() => `${lang.value}-${colorMode.value}`);
</script>

<template>
  <div
    class="rounded-xl border border-border/60 bg-muted/30 overflow-hidden shadow-sm"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between px-3 py-1 border-b border-border/40 bg-muted/50"
    >
      <span
        class="text-[10px] font-semibold capitalize text-muted-foreground select-none"
      >
        {{ lang }}
      </span>

      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            size="xxs"
            :class="[
              'transition-colors duration-200',
              isCopied(id) ? 'text-emerald-500 dark:text-emerald-400' : '',
            ]"
            @click="handleCopyWithKey(id, code)"
          >
            <span class="flex items-center justify-center p-0.5" v-auto-animate>
              <Icon
                :key="isCopied(id) ? 'tick' : 'copy'"
                :name="isCopied(id) ? 'hugeicons:tick-02' : 'hugeicons:copy-01'"
                class="size-3.5"
              />
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{{ getCopyTooltip(isCopied(id)) }}</p>
        </TooltipContent>
      </Tooltip>
    </div>

    <div class="overflow-x-auto px-3 py-2">
      <ShikiCachedRenderer
        v-if="highlighter"
        :key="key"
        :highlighter="highlighter"
        :code="trimmedCode"
        :lang="lang"
        :theme="
          colorMode.value === 'dark' ? 'catppuccin-mocha' : 'catppuccin-latte'
        "
      />
      <pre v-else class="m-0"><code>{{ trimmedCode }}</code></pre>
    </div>
  </div>
</template>
