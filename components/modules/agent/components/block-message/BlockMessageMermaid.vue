<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';
import { useCopyToClipboard } from '~/core/composables/useCopyToClipboard';

const props = defineProps<{
  id: string;
  code: string;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const fullscreenContainerRef = ref<HTMLDivElement | null>(null);
const renderError = ref<string | null>(null);
const renderedSvg = ref<string | null>(null);

const {
  handleCopyWithKey,
  isCopied,
  getCopyIcon,
  getCopyIconClass,
  getCopyTooltip,
} = useCopyToClipboard();

let renderCounter = 0;

const renderDiagram = async () => {
  if (!props.code.trim()) return;

  try {
    renderError.value = null;
    const { default: mermaid } = await import('mermaid');

    mermaid.initialize({
      startOnLoad: false,
      theme: useColorMode().value === 'dark' ? 'dark' : 'default',
      securityLevel: 'strict',
      fontFamily: 'inherit',
    });

    renderCounter += 1;
    const diagramId = `mermaid-${props.id}-${renderCounter}`;
    const { svg } = await mermaid.render(diagramId, props.code.trim());
    renderedSvg.value = svg;
  } catch (error) {
    renderError.value =
      error instanceof Error ? error.message : 'Failed to render diagram';
    renderedSvg.value = null;
  }
};

onMounted(renderDiagram);

watch(() => props.code, renderDiagram);

const isFullscreen = ref(false);
const showCode = ref(false);

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
};
</script>

<template>
  <div class="rounded-xl border overflow-hidden shadow-sm">
    <div
      class="flex items-center justify-between px-3 py-1 border-b border-border/40 bg-muted/50"
    >
      <span
        class="text-xxs font-semibold capitalize text-muted-foreground select-none"
      >
        Mermaid
      </span>
      <div class="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="iconSm" @click="showCode = !showCode">
              <Icon
                :name="showCode ? 'hugeicons:eye' : 'hugeicons:source-code'"
                class="size-4"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {{ showCode ? 'Show diagram' : 'Show source' }}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="iconSm"
              class="w-[unset]"
              @click="handleCopyWithKey(id, code)"
            >
              <span class="flex items-center gap-1 justify-center">
                <Icon
                  :key="isCopied(id) ? 'tick' : 'copy'"
                  :name="getCopyIcon(isCopied(id))"
                  class="size-4"
                  :class="getCopyIconClass(isCopied(id))"
                />
                <span
                  v-if="isCopied(id)"
                  class="text-[10px] font-medium leading-none"
                >
                  Copied
                </span>
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {{ getCopyTooltip(isCopied(id)) }}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="iconSm" @click="toggleFullscreen">
              <Icon
                :name="
                  isFullscreen
                    ? 'hugeicons:arrow-shrink-02'
                    : 'hugeicons:arrow-expand-02'
                "
                class="size-4"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {{ isFullscreen ? 'Exit full view' : 'Full view' }}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>

    <!-- Rendered diagram (compact) -->
    <div v-if="!showCode" class="overflow-auto bg-background max-h-[400px] p-4">
      <div
        v-if="renderError"
        class="text-destructive text-sm p-2 bg-destructive/10 rounded"
      >
        {{ renderError }}
      </div>
      <div
        v-else-if="renderedSvg"
        ref="containerRef"
        class="flex items-center justify-center [&>svg]:max-w-full"
        v-html="renderedSvg"
      />
    </div>

    <!-- Source code -->
    <div v-else class="overflow-x-auto px-3 py-2 chat-code-text">
      <pre class="m-0"><code>{{ code }}</code></pre>
    </div>
  </div>

  <!-- Fullscreen view -->
  <Teleport to="body">
    <div
      v-if="isFullscreen"
      class="fixed inset-0 z-50 bg-background flex flex-col"
    >
      <div
        class="flex items-center justify-between px-4 py-2 border-b border-border"
      >
        <div class="flex items-center gap-2">
          <Icon
            name="hugeicons:chart-relationship"
            class="size-4 text-primary"
          />
          <span class="text-sm font-medium">Mermaid Diagram</span>
        </div>
        <div class="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="xxs"
                class="h-7!"
                @click="showCode = !showCode"
              >
                <Icon
                  :name="showCode ? 'hugeicons:eye' : 'hugeicons:source-code'"
                  class="size-4"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {{ showCode ? 'Show diagram' : 'Show source' }}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="iconSm"
                @click="handleCopyWithKey(id, code)"
              >
                <Icon
                  :name="getCopyIcon(isCopied(id))"
                  class="size-4"
                  :class="getCopyIconClass(isCopied(id))"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {{ getCopyTooltip(isCopied(id)) }}
            </TooltipContent>
          </Tooltip>

          <Button variant="ghost" size="iconSm" @click="toggleFullscreen">
            <Icon name="hugeicons:arrow-shrink-02" class="size-4" />
          </Button>
        </div>
      </div>

      <div v-if="!showCode" class="flex-1 overflow-auto p-6">
        <div
          v-if="renderError"
          class="text-destructive text-sm p-2 bg-destructive/10 rounded"
        >
          {{ renderError }}
        </div>
        <div
          v-else-if="renderedSvg"
          ref="fullscreenContainerRef"
          class="flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full"
          v-html="renderedSvg"
        />
      </div>

      <div v-else class="flex-1 overflow-auto px-4 py-3 chat-code-text">
        <pre class="m-0"><code>{{ code }}</code></pre>
      </div>
    </div>
  </Teleport>
</template>
