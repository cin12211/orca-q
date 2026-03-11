<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import type { HTMLAttributes } from 'vue';
import { ListboxFilter, useForwardProps } from 'reka-ui';
import type { ListboxFilterProps } from 'reka-ui';
import { useCommand } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import type { CommandPrefix } from '../types/commandEngine.types';

defineOptions({
  inheritAttrs: false,
});

const props = defineProps<
  ListboxFilterProps & {
    class?: HTMLAttributes['class'];
    activePrefix?: CommandPrefix | null;
    placeholder?: string;
  }
>();

const searchInput = defineModel<string>('searchInput', { default: '' });

const delegatedProps = reactiveOmit(
  props,
  'class',
  'activePrefix',
  'placeholder'
);
const forwardedProps = useForwardProps(delegatedProps);

const { filterState } = useCommand();

// Sync: when our searchInput changes, update filterState
// In prefix mode, strip prefix from what filterState sees so shadcn filtering still works
watch(
  searchInput,
  () => {
    // Disable shadcn's internal filtering by always setting search to empty.
    // This allows our custom fuzzy search engine to handle all filtering.
    filterState.search = '';
  },
  { immediate: true }
);
</script>

<template>
  <div class="flex items-center border-b px-3" cmdk-input-wrapper>
    <!-- Prefix badge -->
    <div
      v-if="activePrefix"
      class="mr-2 flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground shrink-0"
    >
      <Icon
        :name="activePrefix.icon"
        :class="['size-3', activePrefix.iconClass]"
      />
      <span>{{ activePrefix.label }}</span>
    </div>

    <Icon v-else name="hugeicons:search-01" class="mr-2 h-4 w-4 shrink-0" />

    <ListboxFilter
      v-bind="{ ...forwardedProps, ...$attrs }"
      v-model="searchInput"
      auto-focus
      :placeholder="placeholder || 'Type a command or search...'"
      :class="
        cn(
          'flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          props.class
        )
      "
    />
  </div>
</template>
