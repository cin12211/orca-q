import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { useTableActions } from '~/core/composables/useTableActions';

const createGridApi = () => ({
  ensureColumnVisible: vi.fn(),
  refreshCells: vi.fn(),
  refreshHeader: vi.fn(),
  ensureIndexVisible: vi.fn(),
});

describe('useTableActions', () => {
  it('starts with undefined selected column', () => {
    const quickQueryTableRef = ref({ gridApi: createGridApi() }) as any;
    const { selectedColumnFieldId } = useTableActions({ quickQueryTableRef });

    expect(selectedColumnFieldId.value).toBeUndefined();
  });

  it('sets selected column when selecting a field', () => {
    const quickQueryTableRef = ref({ gridApi: createGridApi() }) as any;
    const { selectedColumnFieldId, handleSelectColumn } = useTableActions({
      quickQueryTableRef,
    });

    handleSelectColumn('id');

    expect(selectedColumnFieldId.value).toBe('id');
  });

  it('calls grid api to jump when selecting a valid field', () => {
    const gridApi = createGridApi();
    const quickQueryTableRef = ref({ gridApi }) as any;
    const { handleSelectColumn } = useTableActions({ quickQueryTableRef });

    handleSelectColumn('email');

    expect(gridApi.ensureColumnVisible).toHaveBeenCalledWith('email', 'middle');
    expect(gridApi.refreshCells).toHaveBeenCalledWith({ force: true });
    expect(gridApi.refreshHeader).toHaveBeenCalledTimes(1);
  });

  it('does not jump when selecting undefined field', () => {
    const gridApi = createGridApi();
    const quickQueryTableRef = ref({ gridApi }) as any;
    const { handleSelectColumn } = useTableActions({ quickQueryTableRef });

    handleSelectColumn(undefined);

    expect(gridApi.ensureColumnVisible).not.toHaveBeenCalled();
    expect(gridApi.refreshHeader).not.toHaveBeenCalled();
  });

  it('resetGridState clears selected column', () => {
    const quickQueryTableRef = ref({ gridApi: createGridApi() }) as any;
    const { selectedColumnFieldId, handleSelectColumn, resetGridState } =
      useTableActions({ quickQueryTableRef });

    handleSelectColumn('name');
    resetGridState();

    expect(selectedColumnFieldId.value).toBeUndefined();
  });

  it('resetGridState moves grid to first row', () => {
    const gridApi = createGridApi();
    const quickQueryTableRef = ref({ gridApi }) as any;
    const { resetGridState } = useTableActions({ quickQueryTableRef });

    resetGridState();

    expect(gridApi.ensureIndexVisible).toHaveBeenCalledWith(0, 'top');
  });

  it('resetGridState refreshes header and cells', () => {
    const gridApi = createGridApi();
    const quickQueryTableRef = ref({ gridApi }) as any;
    const { resetGridState } = useTableActions({ quickQueryTableRef });

    resetGridState();

    expect(gridApi.refreshHeader).toHaveBeenCalledTimes(1);
    expect(gridApi.refreshCells).toHaveBeenCalledWith({ force: true });
  });

  it('is safe when table ref has no gridApi', () => {
    const quickQueryTableRef = ref(undefined) as any;
    const { handleSelectColumn, resetGridState } = useTableActions({
      quickQueryTableRef,
    });

    expect(() => handleSelectColumn('id')).not.toThrow();
    expect(() => resetGridState()).not.toThrow();
  });
});
