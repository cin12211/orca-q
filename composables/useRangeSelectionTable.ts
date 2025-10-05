import { useEventListener } from '@vueuse/core';
import type { ShallowRef } from 'vue';
import {
  type CellMouseDownEvent,
  type CellMouseOverEvent,
  type GridApi,
} from 'ag-grid-community';
import debounce from 'lodash-es/debounce';
import {
  DEFAULT_DEBOUNCE_RANGE_SELECTION,
  DEFAULT_ROW_HEIGHT,
} from '~/utils/constants';

/**
 * Hook hỗ trợ:
 * 1. Range selection cho AG Grid (drag chọn nhiều hàng)
 * 2. Auto scroll mượt khi kéo gần mép viewport (theo cơ chế pointer + RAF)
 */
export const useRangeSelectionTable = ({
  debounceDelay = DEFAULT_DEBOUNCE_RANGE_SELECTION,
  gridApi,
  rowHeight = DEFAULT_ROW_HEIGHT,
  gridRef,
}: {
  debounceDelay?: number;
  gridApi?: globalThis.Ref<GridApi | null>;
  rowHeight?: number;
  gridRef: Readonly<ShallowRef<HTMLElement | null>>;
}) => {
  // ==== STATE: range selection tracking ====
  const isSelectingRange = ref(false);
  const startRowIndex = ref<number>(-1);
  const prevRange = reactive({ min: -1, max: -1 });

  // ==== STATE: auto-scroll tracking ====
  let gridViewportEl: HTMLElement | null = null;
  let isDraggingPointer = false;
  let pointerPos = { x: 0, y: 0 };
  let scrollFrameId: number | null = null;
  let currentSelectionIndex = -1;
  let autoScrollAccumY = 0;

  const EDGE_MARGIN = 10; // px
  const SCROLL_SPEED_MAX = 10; // px/frame

  // ============================================================
  // 📦 RANGE SELECTION LOGIC
  // ============================================================

  function updateRowSelectionRange({
    currentIndex,
    gridApi,
  }: {
    currentIndex: number;
    gridApi: GridApi;
  }) {
    const start = startRowIndex.value;
    const min = Math.min(start, currentIndex);
    const max = Math.max(start, currentIndex);

    // skip nếu không thay đổi
    if (min === prevRange.min && max === prevRange.max) return;

    // Bỏ chọn vùng cũ
    if (prevRange.min !== -1) {
      for (let i = prevRange.min; i <= prevRange.max; i++) {
        if (i < min || i > max) {
          gridApi.getDisplayedRowAtIndex(i)?.setSelected(false);
        }
      }
    }

    // Chọn vùng mới
    for (let i = min; i <= max; i++) {
      if (i < prevRange.min || i > prevRange.max) {
        gridApi.getDisplayedRowAtIndex(i)?.setSelected(true);
      }
    }

    prevRange.min = min;
    prevRange.max = max;
  }

  function resetRangeSelection() {
    isSelectingRange.value = false;
    startRowIndex.value = -1;
    prevRange.min = -1;
    prevRange.max = -1;
  }

  function handleCellMouseDown(params: CellMouseDownEvent) {
    const gridApi = params.api;
    const event = params.event as MouseEvent;

    const isLeftClick = event?.button === 0;
    const isShiftHeld = event?.shiftKey;

    if (!isLeftClick || isShiftHeld) return;
    if (params.rowIndex == null) return;

    isSelectingRange.value = true;
    startRowIndex.value = params.rowIndex;

    gridApi.deselectAll();
    params.node.setSelected(true);
  }

  function handleCellMouseOver(params: CellMouseOverEvent, gridApi: GridApi) {
    if (!isSelectingRange.value || params.rowIndex == null) return;

    currentSelectionIndex = params.rowIndex;
    updateRowSelectionRange({ currentIndex: params.rowIndex, gridApi });
  }

  const handleCellMouseOverDebounced = debounce(
    (params: CellMouseOverEvent) => {
      const gridApi = params.api;
      handleCellMouseOver(params, gridApi);
    },
    debounceDelay,
    { leading: true, trailing: true }
  );

  // ============================================================
  // 🧭 AUTO SCROLL LOGIC (drag pointer + smooth scroll)
  // ============================================================

  function handlePointerDown(e: PointerEvent) {
    if (!(e.target instanceof HTMLElement)) return;

    isDraggingPointer = true;
    pointerPos.x = e.clientX;
    pointerPos.y = e.clientY;

    document.addEventListener('pointermove', handlePointerMove, true);
    document.addEventListener('pointerup', handlePointerUp, {
      once: true,
      capture: true,
    });

    startAutoScrollLoop();
  }

  function handlePointerMove(e: PointerEvent) {
    pointerPos.x = e.clientX;
    pointerPos.y = e.clientY;
  }

  function handlePointerUp() {
    isDraggingPointer = false;
    document.removeEventListener('pointermove', handlePointerMove, true);
    stopAutoScrollLoop();
  }

  function startAutoScrollLoop() {
    if (scrollFrameId) return;

    const loop = () => {
      if (!isDraggingPointer || !gridViewportEl) {
        scrollFrameId = null;
        return;
      }

      const rect = gridViewportEl.getBoundingClientRect();
      let scrollDeltaY = 0;

      const isSelectMore =
        pointerPos.y < rect.top || pointerPos.y > rect.bottom;

      // Scroll up
      if (pointerPos.y < rect.top + EDGE_MARGIN) {
        scrollDeltaY = -Math.ceil(
          ((EDGE_MARGIN - (pointerPos.y - rect.top)) / EDGE_MARGIN) *
            SCROLL_SPEED_MAX
        );
      }
      // Scroll down
      else if (pointerPos.y > rect.bottom - EDGE_MARGIN) {
        scrollDeltaY = Math.ceil(
          ((pointerPos.y - (rect.bottom - EDGE_MARGIN)) / EDGE_MARGIN) *
            SCROLL_SPEED_MAX
        );
      }

      if (scrollDeltaY !== 0 && isSelectMore) {
        autoScrollAccumY += scrollDeltaY;

        gridViewportEl.scrollTop += scrollDeltaY;

        if (gridApi?.value) {
          // compute how many "rows" worth of scroll we’ve accumulated
          const rowOffset = Math.trunc(autoScrollAccumY / rowHeight);

          if (rowOffset !== 0) {
            // remove consumed scroll distance
            autoScrollAccumY -= rowOffset * rowHeight;

            // update selection index (handle both directions)
            currentSelectionIndex += rowOffset;

            if (currentSelectionIndex <= 0) {
              currentSelectionIndex = 0;
            }

            updateRowSelectionRange({
              currentIndex: currentSelectionIndex,
              gridApi: gridApi?.value,
            });
          }
        }
      }

      scrollFrameId = requestAnimationFrame(loop);
    };

    scrollFrameId = requestAnimationFrame(loop);
  }

  function stopAutoScrollLoop() {
    if (scrollFrameId) cancelAnimationFrame(scrollFrameId);
    scrollFrameId = null;
    autoScrollAccumY = 0;
  }

  // ============================================================
  // 🌱 LIFECYCLE & EVENT BINDING
  // ============================================================

  useEventListener('mouseup', () => {
    if (isSelectingRange.value) {
      stopAutoScrollLoop();
      resetRangeSelection();
    }
  });

  onMounted(async () => {
    await nextTick();
    // gridViewportEl = document.querySelector(
    //   '.ag-body-viewport'
    // ) as HTMLElement | null;
    const agGridDom = gridRef?.value as unknown as { $el: HTMLElement };

    gridViewportEl = agGridDom?.$el?.querySelector(
      '.ag-body-viewport'
    ) as HTMLElement | null;

    if (gridViewportEl) {
      gridViewportEl.addEventListener('pointerdown', handlePointerDown);
    }
  });

  onUnmounted(() => {
    stopAutoScrollLoop();
    gridViewportEl?.removeEventListener('pointerdown', handlePointerDown);
  });

  // ============================================================
  // 🎯 PUBLIC API
  // ============================================================

  return {
    // Range selection handlers
    handleCellMouseDown,
    handleCellMouseOverDebounced,
  };
};
