import { ref, onActivated, onDeactivated, nextTick, useTemplateRef } from 'vue';
import type { ComputedRef } from 'vue';
import { useVirtualizer } from '@tanstack/vue-virtual';

interface UseTreeVirtualizerProps {
  itemHeight: number;
  overscan: number;
}

/**
 * Wraps @tanstack/vue-virtual for the row list and restores scroll
 * position across <KeepAlive> deactivate/activate cycles.
 */
export function useTreeVirtualizer(
  props: UseTreeVirtualizerProps,
  visibleNodeIds: ComputedRef<string[]>
) {
  const parentRef = useTemplateRef<HTMLElement | null>('parentRef');
  const isMouseInside = ref(false);
  const savedScrollOffset = ref(0);

  const rowVirtualizer = useVirtualizer({
    get count() {
      return visibleNodeIds.value.length;
    },
    getScrollElement: () => parentRef.value,
    estimateSize: () => props.itemHeight,
    overscan: props.overscan,
  });

  onDeactivated(() => {
    savedScrollOffset.value =
      Math.round(rowVirtualizer.value.scrollOffset ?? 0) || 0;
  });

  onActivated(async () => {
    await nextTick();

    setTimeout(() => {
      rowVirtualizer.value.scrollToOffset(savedScrollOffset.value);
    }, 0);
  });

  // Scroll focused item into view
  const scrollToItem = (nodeId: string) => {
    if (!parentRef.value) return;

    const index = visibleNodeIds.value.indexOf(nodeId);
    if (index === -1) return;

    rowVirtualizer.value.scrollToIndex(index, {
      align: 'center',
      behavior: 'auto',
    });
  };

  return {
    parentRef,
    isMouseInside,
    rowVirtualizer,
    scrollToItem,
  };
}
