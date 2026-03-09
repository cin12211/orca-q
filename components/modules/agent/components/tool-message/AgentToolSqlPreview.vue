<script setup lang="ts">
import { toRef } from 'vue';

const props = withDefaults(
  defineProps<{
    id: string;
    sql: string;
    label?: string;
    defaultOpen?: boolean;
  }>(),
  {
    label: 'View SQL',
    defaultOpen: false,
  }
);

const isOpen = ref(false);

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
      {{ props.label }}

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
        <div class="my-1">
          <BlockMessageCode :id="props.id" :code="props.sql" language="sql" />
        </div>
      </div>
    </Transition>
  </div>
</template>
