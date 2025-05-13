import {
  _debounce,
  type CellMouseDownEvent,
  type GridApi,
} from 'ag-grid-community';
import {
  DEFAULT_DEBOUNCE_RANGE_SELECTION,
  DEFAULT_EDGE_ZONE_HEIGHT,
  DEFAULT_SCROLL_STEP,
} from '~/utils/constants';

export const useRangeSelectionTable = ({
  scrollStep = DEFAULT_SCROLL_STEP,
  fallBackEdgeZoneHeight = DEFAULT_EDGE_ZONE_HEIGHT,
  debounceRangeSelection = DEFAULT_DEBOUNCE_RANGE_SELECTION,
}: {
  scrollStep?: number;
  fallBackEdgeZoneHeight?: number;
  debounceRangeSelection?: number;
}) => {
  const isStartRangeSelection = ref(false);
  const startRangeSelectedRowIndex = ref<number>(-1);

  // track the previous range – start & end can swap when dragging upwards
  const prevMin = ref(-1);
  const prevMax = ref(-1);

  function updateRangeSelectRows({
    currentIndex,
    gridApi,
  }: {
    currentIndex: number;
    gridApi: GridApi;
  }) {
    const start = startRangeSelectedRowIndex.value;
    const min = Math.min(start, currentIndex);
    const max = Math.max(start, currentIndex);

    // nothing changed → skip
    if (min === prevMin.value && max === prevMax.value) return;

    // 1. deselect rows that just left the range
    if (prevMin.value !== -1) {
      for (let i = prevMin.value; i <= prevMax.value; i++) {
        if (i < min || i > max) {
          gridApi.getDisplayedRowAtIndex(i)?.setSelected(false);
        }
      }
    }

    // 2. select rows that just entered the range
    for (let i = min; i <= max; i++) {
      if (i < prevMin.value || i > prevMax.value) {
        gridApi.getDisplayedRowAtIndex(i)?.setSelected(true);
      }
    }

    prevMin.value = min;
    prevMax.value = max;
  }

  const scrollMoreIfNeed = ({
    mouseEvent,
    rowIndex,
    gridApi,
  }: {
    rowIndex: number;
    mouseEvent: MouseEvent;
    gridApi: GridApi;
  }) => {
    let edgeZoneHeight = fallBackEdgeZoneHeight;
    if ((mouseEvent.target as HTMLElement)?.offsetHeight) {
      edgeZoneHeight = (mouseEvent.target as HTMLElement).offsetHeight * 2;
    }

    const verticalPixelRange = gridApi.getVerticalPixelRange();

    if (mouseEvent.layerY + edgeZoneHeight > verticalPixelRange.bottom) {
      gridApi.ensureIndexVisible(rowIndex + scrollStep, 'bottom');
    }

    if (mouseEvent.layerY - edgeZoneHeight < verticalPixelRange.top) {
      gridApi.ensureIndexVisible(rowIndex - scrollStep, 'top');
    }
  };

  const onStopRangeSelection = () => {
    isStartRangeSelection.value = false;
    startRangeSelectedRowIndex.value = -1;
    prevMin.value = -1;
    prevMax.value = -1;
  };

  const onCellMouseDown = (params: CellMouseDownEvent) => {
    const gridApi = params.api;
    const event = params.event as MouseEvent;

    const isLeftClick = event?.button === 0;
    const isPressShift = event?.shiftKey;

    if (!isLeftClick || isPressShift) {
      return;
    }

    isStartRangeSelection.value = true;
    if (!params.rowIndex) return;

    startRangeSelectedRowIndex.value = params.rowIndex;

    gridApi.deselectAll();
    params.node.setSelected(true);
  };

  const onCellMouseOver = (params: CellMouseDownEvent, gridApi: GridApi) => {
    if (!params.rowIndex || !isStartRangeSelection.value) return;

    const rowIndex = params.rowIndex;
    const mouseEvent = params.event as MouseEvent;

    updateRangeSelectRows({
      currentIndex: rowIndex,
      gridApi,
    });

    scrollMoreIfNeed({
      rowIndex,
      mouseEvent,
      gridApi,
    });
  };

  const onCellMouseOverDebounced = _debounce(
    { isAlive: () => true },
    (params: CellMouseDownEvent) => {
      const gridApi = params.api;

      onCellMouseOver(params, gridApi);
    },
    debounceRangeSelection
  );

  return {
    onStopRangeSelection,
    updateRangeSelectRows,
    scrollMoreIfNeed,
    onCellMouseDown,
    onCellMouseOver,
    isStartRangeSelection,
    startRangeSelectedRowIndex,
    onCellMouseOverDebounced,
  };
};
