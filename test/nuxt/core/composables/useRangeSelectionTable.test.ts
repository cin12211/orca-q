import { ref, shallowRef } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRangeSelectionTable } from '~/core/composables/useRangeSelectionTable';

const createGridApi = () => {
  const nodes = new Map<number, { setSelected: ReturnType<typeof vi.fn> }>();

  for (let index = 0; index < 10; index += 1) {
    nodes.set(index, { setSelected: vi.fn() });
  }

  return {
    gridApi: {
      deselectAll: vi.fn(),
      getDisplayedRowAtIndex: vi.fn((index: number) => nodes.get(index)),
    },
    nodes,
  };
};

describe('useRangeSelectionTable', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns public handlers', () => {
    const { gridApi } = createGridApi();
    const composable = useRangeSelectionTable({
      gridApi: ref(gridApi as any),
      gridRef: shallowRef(null),
      debounceDelay: 0,
    });

    expect(typeof composable.handleCellMouseDown).toBe('function');
    expect(typeof composable.handleCellMouseOverDebounced).toBe('function');
  });

  it('starts range selection on left mouse down', () => {
    const { gridApi, nodes } = createGridApi();
    const { handleCellMouseDown } = useRangeSelectionTable({
      gridApi: ref(gridApi as any),
      gridRef: shallowRef(null),
      debounceDelay: 0,
    });

    handleCellMouseDown({
      api: gridApi as any,
      node: nodes.get(2),
      rowIndex: 2,
      event: new MouseEvent('mousedown', { button: 0 }),
    } as any);

    expect(gridApi.deselectAll).toHaveBeenCalledTimes(1);
    expect(nodes.get(2)?.setSelected).toHaveBeenCalledWith(true);
  });

  it('ignores right mouse down', () => {
    const { gridApi, nodes } = createGridApi();
    const { handleCellMouseDown } = useRangeSelectionTable({
      gridApi: ref(gridApi as any),
      gridRef: shallowRef(null),
      debounceDelay: 0,
    });

    handleCellMouseDown({
      api: gridApi as any,
      node: nodes.get(2),
      rowIndex: 2,
      event: new MouseEvent('mousedown', { button: 2 }),
    } as any);

    expect(gridApi.deselectAll).not.toHaveBeenCalled();
  });

  it('ignores shift+left mouse down', () => {
    const { gridApi, nodes } = createGridApi();
    const { handleCellMouseDown } = useRangeSelectionTable({
      gridApi: ref(gridApi as any),
      gridRef: shallowRef(null),
      debounceDelay: 0,
    });

    handleCellMouseDown({
      api: gridApi as any,
      node: nodes.get(2),
      rowIndex: 2,
      event: new MouseEvent('mousedown', { button: 0, shiftKey: true }),
    } as any);

    expect(gridApi.deselectAll).not.toHaveBeenCalled();
  });

  it('ignores mouse down with missing row index', () => {
    const { gridApi, nodes } = createGridApi();
    const { handleCellMouseDown } = useRangeSelectionTable({
      gridApi: ref(gridApi as any),
      gridRef: shallowRef(null),
      debounceDelay: 0,
    });

    handleCellMouseDown({
      api: gridApi as any,
      node: nodes.get(2),
      rowIndex: null,
      event: new MouseEvent('mousedown', { button: 0 }),
    } as any);

    expect(gridApi.deselectAll).not.toHaveBeenCalled();
  });

  it('updates selection range on mouse over after selection starts', () => {
    const { gridApi, nodes } = createGridApi();
    const { handleCellMouseDown, handleCellMouseOverDebounced } =
      useRangeSelectionTable({
        gridApi: ref(gridApi as any),
        gridRef: shallowRef(null),
        debounceDelay: 0,
      });

    handleCellMouseDown({
      api: gridApi as any,
      node: nodes.get(1),
      rowIndex: 1,
      event: new MouseEvent('mousedown', { button: 0 }),
    } as any);

    handleCellMouseOverDebounced({
      api: gridApi as any,
      rowIndex: 3,
    } as any);

    vi.runAllTimers();

    expect(nodes.get(2)?.setSelected).toHaveBeenCalledWith(true);
    expect(nodes.get(3)?.setSelected).toHaveBeenCalledWith(true);
  });

  it('does nothing on mouse over before selection starts', () => {
    const { gridApi, nodes } = createGridApi();
    const { handleCellMouseOverDebounced } = useRangeSelectionTable({
      gridApi: ref(gridApi as any),
      gridRef: shallowRef(null),
      debounceDelay: 0,
    });

    handleCellMouseOverDebounced({
      api: gridApi as any,
      rowIndex: 4,
    } as any);

    vi.runAllTimers();

    expect(nodes.get(4)?.setSelected).not.toHaveBeenCalled();
  });

  it('stops selection after mouseup event', () => {
    const { gridApi, nodes } = createGridApi();
    const { handleCellMouseDown, handleCellMouseOverDebounced } =
      useRangeSelectionTable({
        gridApi: ref(gridApi as any),
        gridRef: shallowRef(null),
        debounceDelay: 0,
      });

    handleCellMouseDown({
      api: gridApi as any,
      node: nodes.get(0),
      rowIndex: 0,
      event: new MouseEvent('mousedown', { button: 0 }),
    } as any);

    window.dispatchEvent(new MouseEvent('mouseup'));

    handleCellMouseOverDebounced({
      api: gridApi as any,
      rowIndex: 2,
    } as any);

    vi.runAllTimers();

    expect(nodes.get(1)?.setSelected).not.toHaveBeenCalled();
    expect(nodes.get(2)?.setSelected).not.toHaveBeenCalled();
  });
});
