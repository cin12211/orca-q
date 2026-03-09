<script setup lang="ts">
import { toRef } from 'vue';
import { useSmoothStream } from '~/core/composables/useSmoothStream';
import AgentTextBloom from '../AgentTextBloom.vue';

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

const steps = computed(() =>
  smoothedContent.value
    .split(/\n{2,}/)
    .map(step => step.trim())
    .filter(Boolean)
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
      class="flex cursor-pointer items-center justify-start gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      @click="isOpen = !isOpen"
    >
      <Icon
        name="hugeicons:ai-brain-05"
        class="size-4 shrink-0"
        :class="{ 'animate-pulse text-primary': isStreaming }"
      />

      <AgentTextBloom
        v-if="isStreaming"
        label="Reasoning"
        class="text-xs font-medium text-primary"
        bloom-color="#4f46e5"
        :bloom-intensity="1.06"
      />
      <span v-else class="inline-flex items-center gap-0.5 text-primary">
        Reasoning
      </span>

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
          class="mt-2 space-y-2 border-l-2 border-border pl-3 py-1 text-xs text-foreground/80"
        >
          <template v-if="steps.length > 1">
            <div
              v-for="(step, index) in steps"
              :key="`${index}-${step.slice(0, 24)}`"
            >
              <p class="min-w-0 whitespace-pre-wrap leading-relaxed">
                {{ index + 1 }}. {{ step }}
              </p>
            </div>
          </template>

          <p v-else class="whitespace-pre-wrap leading-relaxed">
            {{ content }}
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>
