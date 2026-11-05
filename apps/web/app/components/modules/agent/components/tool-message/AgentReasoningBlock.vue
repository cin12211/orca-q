<script setup lang="ts">
import Shimmer from '~/components/base/shimmer/Shimmer.vue';
import { useSmoothStream } from '~/core/composables/useSmoothStream';
import BlockMessageMarkdown from '../block-message/BlockMessageMarkdown.vue';

const props = defineProps<{
  content: string;
  isStreaming: boolean;
}>();

const isStreamingRef = toRef(props, 'isStreaming');
const smoothedContent = useSmoothStream(
  toRef(props, 'content'),
  isStreamingRef
);

const isOpen = ref(false);

watch(
  () => props.isStreaming,
  streaming => {
    if (streaming) isOpen.value = true;
    else isOpen.value = false;
  },
  { immediate: true }
);

function onEnter(el: Element) {
  const element = el as HTMLElement;
  element.style.height = '0';
  element.style.opacity = '0';
  requestAnimationFrame(() => {
    element.style.height = element.scrollHeight + 'px';
    element.style.opacity = '1';
  });
}

function onAfterEnter(el: Element) {
  (el as HTMLElement).style.height = 'auto';
}

function onLeave(el: Element) {
  const element = el as HTMLElement;
  element.style.height = element.scrollHeight + 'px';
  element.style.opacity = '1';
  requestAnimationFrame(() => {
    element.style.height = '0';
    element.style.opacity = '0';
  });
}
</script>

<template>
  <div class="overflow-hidden">
    <button
      type="button"
      class="flex cursor-pointer items-center justify-start gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      @click="isOpen = !isOpen"
    >
      <Icon
        name="hugeicons:ai-brain-05"
        class="size-3.5! shrink-0"
        :class="{ 'animate-pulse text-primary': isStreaming }"
      />

      <Shimmer :duration="1" v-if="isStreaming">Reasoning</Shimmer>
      <span v-else class=""> Reasoning </span>

      <Icon
        name="lucide:chevron-down"
        class="ml-auto size-4 transition-transform duration-300"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <Transition @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave">
      <div
        v-if="isOpen"
        class="overflow-hidden transition-[height,opacity] duration-300 ease-in-out"
      >
        <div
          class="mt-2 border-l-2 border-border pl-3 py-1 text-foreground/80 opacity-70 chat-text"
        >
          <BlockMessageMarkdown
            :content="smoothedContent"
            :is-streaming="isStreaming"
            :is-block-streaming="isStreaming"
            :is-user-message="false"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>
