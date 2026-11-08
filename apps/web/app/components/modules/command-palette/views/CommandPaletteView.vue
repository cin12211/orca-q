<script setup lang="ts">
import { useEventListener } from '@vueuse/core';
import { computed } from 'vue';
import { Button } from '#components';
import { Icon, Tooltip, TooltipContent, TooltipTrigger } from '#components';
import { useVirtualizer } from '@tanstack/vue-virtual';
import { Command } from '@/components/ui/command';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import CommandPaletteGuide from '../components/CommandPaletteGuide.vue';
import CommandPaletteInput from '../components/CommandPaletteInput.vue';
import { useCommandEngine } from '../hooks/useCommandEngine';
import { useCommandPalette } from '../hooks/useCommandPalette';

const { isCommandPaletteOpen } = useCommandPalette();

const { searchInput, groupedResults, activePrefix, placeholder, resetSearch } =
  useCommandEngine();

type FlatItemInfo =
  | { type: 'header'; label: string; index: number }
  | { type: 'item'; item: any; index: number };

const flatItems = computed(() => {
  const result: FlatItemInfo[] = [];
  let index = 0;
  for (const [groupName, items] of groupedResults.value.entries()) {
    result.push({ type: 'header', label: groupName, index: index++ });
    for (const item of items) {
      result.push({ type: 'item', item, index: index++ });
    }
  }
  return result;
});

const parentRef = ref<HTMLElement | null>(null);

const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: flatItems.value.length,
    getScrollElement: () => parentRef.value,
    estimateSize: (idx: number) => {
      // Header might be 30px, Item might be 28px
      const item = flatItems.value[idx];
      return item.type === 'header' ? 30 : 28;
    },
    overscan: 5,
  }))
);

useHotkeys(
  [
    {
      key: 'meta+k',
      callback: async () => {
        isCommandPaletteOpen.value = !isCommandPaletteOpen.value;
      },
      isPreventDefault: true,
    },
    {
      key: 'meta+p',
      callback: () => {
        isCommandPaletteOpen.value = !isCommandPaletteOpen.value;
        searchInput.value = '>';
      },
      isPreventDefault: true,
    },
  ],
  {}
);

// Reset search when dialog closes
watch(isCommandPaletteOpen, open => {
  if (!open) resetSearch();
});

const activeIndex = ref(-1);

const ensureValidActiveIndex = () => {
  if (flatItems.value.length === 0) {
    activeIndex.value = -1;
    return;
  }
  if (
    activeIndex.value < 0 ||
    activeIndex.value >= flatItems.value.length ||
    flatItems.value[activeIndex.value].type === 'header'
  ) {
    const firstValid = flatItems.value.findIndex(item => item.type === 'item');
    activeIndex.value = firstValid >= 0 ? firstValid : -1;
  }
};

watch([flatItems, isCommandPaletteOpen], () => {
  ensureValidActiveIndex();
});

useEventListener('keydown', (e: KeyboardEvent) => {
  if (!isCommandPaletteOpen.value || flatItems.value.length === 0) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    let nextIndex = activeIndex.value + 1;
    while (
      nextIndex < flatItems.value.length &&
      flatItems.value[nextIndex].type === 'header'
    ) {
      nextIndex++;
    }
    if (nextIndex < flatItems.value.length) {
      activeIndex.value = nextIndex;
      rowVirtualizer.value.scrollToIndex(nextIndex, { align: 'auto' });
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    let prevIndex = activeIndex.value - 1;
    while (prevIndex >= 0 && flatItems.value[prevIndex].type === 'header') {
      prevIndex--;
    }
    if (prevIndex >= 0) {
      activeIndex.value = prevIndex;
      rowVirtualizer.value.scrollToIndex(prevIndex, { align: 'auto' });
    }
  } else if (e.key === 'Enter') {
    if (activeIndex.value >= 0 && activeIndex.value < flatItems.value.length) {
      const currentObj = flatItems.value[activeIndex.value];
      if (currentObj.type === 'item') {
        e.preventDefault();
        handleSelectCommand(currentObj.item);
      }
    }
  }
});

/** Execute a command from the engine */
const handleSelectCommand = (item: { execute: () => void | Promise<void> }) => {
  isCommandPaletteOpen.value = false;
  item.execute();
};

/** Highlight fuse.js match indices for a given string */
const highlightMatch = (
  text: string,
  matches?: readonly any[],
  key: string = 'label'
) => {
  if (!matches || !matches.length || !text) return text;
  const match = matches.find((m: any) => m.key === key);
  if (!match || !match.indices) return text;

  let result = '';
  let lastIndex = 0;

  for (const [start, end] of match.indices) {
    result += text.substring(lastIndex, start);
    result +=
      `<span class="font-medium text-[#3794ff] underline">` +
      text.substring(start, end + 1) +
      `</span>`;
    lastIndex = end + 1;
  }
  result += text.substring(lastIndex);

  return result;
};
</script>

<template>
  <Dialog v-model:open="isCommandPaletteOpen">
    <DialogContent
      class="overflow-hidden p-0 shadow-lg sm:max-w-[600px] h-[450px] flex flex-col"
      :showCloseButton="false"
    >
      <DialogTitle class="sr-only">Command Palette</DialogTitle>
      <Command
        class="flex h-full w-full flex-col overflow-hidden bg-popover text-popover-foreground"
      >
        <!-- Single input that syncs both filterState and searchInput -->
        <CommandPaletteInput
          v-model:search-input="searchInput"
          :active-prefix="activePrefix"
          :placeholder="placeholder"
        />

        <!-- <CommandList> -->
        <template v-if="flatItems.length === 0">
          <!-- <CommandEmpty> -->
          <div class="py-4 px-4 space-y-3 h-full">
            <p class="text-sm text-muted-foreground text-center">
              No results found. Try a different prefix:
            </p>
            <CommandPaletteGuide variant="empty" />
          </div>
          <!-- </CommandEmpty> -->
        </template>

        <template v-else>
          <!-- The scroll container requires flex grow with overflow handling -->
          <div
            ref="parentRef"
            class="flex-1 w-full overflow-y-auto overflow-x-hidden p-1 text-foreground"
          >
            <div
              :style="{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative',
                width: '100%',
              }"
            >
              <div
                v-for="virtualRow in rowVirtualizer.getVirtualItems()"
                :key="virtualRow.key as PropertyKey"
                :style="{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }"
              >
                <template v-if="flatItems[virtualRow.index].type === 'header'">
                  <p
                    class="px-2 py-1.5 text-xs font-medium text-muted-foreground truncate"
                  >
                    {{ (flatItems[virtualRow.index] as any).label }}
                  </p>
                </template>
                <template v-else>
                  <!-- Workaround for Vue template type inference: cast to `item` branch of the union type -->
                  <div
                    :value="(flatItems[virtualRow.index] as any).item.id"
                    :data-highlighted="
                      activeIndex === virtualRow.index ? '' : undefined
                    "
                    class="relative flex gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer h-full -mb-1"
                    @mouseenter="activeIndex = virtualRow.index"
                    @click="
                      () =>
                        handleSelectCommand(
                          (flatItems[virtualRow.index] as any).item
                        )
                    "
                  >
                    <Icon
                      :name="(flatItems[virtualRow.index] as any).item.icon"
                      :class="[
                        'size-4 shrink-0',
                        (flatItems[virtualRow.index] as any).item.iconClass,
                      ]"
                    />
                    <span
                      class="truncate"
                      v-html="
                        highlightMatch(
                          (flatItems[virtualRow.index] as any).item.label,
                          (flatItems[virtualRow.index] as any).item.matches,
                          'label'
                        )
                      "
                    />
                    <span
                      v-if="
                        (flatItems[virtualRow.index] as any).item.description
                      "
                      class="ml-auto text-xs text-muted-foreground truncate"
                      v-html="
                        highlightMatch(
                          (flatItems[virtualRow.index] as any).item.description,
                          (flatItems[virtualRow.index] as any).item.matches,
                          'description'
                        )
                      "
                    />
                  </div>
                </template>
              </div>
            </div>
          </div>
        </template>

        <div
          class="flex items-center justify-between border-t px-3 py-1.5 text-[11px] text-muted-foreground"
        >
          <div class="flex items-center gap-3">
            <span><Kbd class="text-xxs">↑↓</Kbd> Navigate</span>
            <span><Kbd class="text-xxs">↵</Kbd> Select</span>
            <span><Kbd class="text-xxs">Esc</Kbd> Close</span>
          </div>

          <div class="w-6">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button size="iconSm" variant="ghost">
                    <Icon name="hugeicons:help-circle" class="w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" align="end" class="w-56 p-2">
                  <p class="text-xs font-medium mb-1.5">Prefix shortcuts</p>
                  <CommandPaletteGuide variant="tooltip" />
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </Command>
    </DialogContent>
  </Dialog>
</template>
