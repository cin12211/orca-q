import { ref } from 'vue';
import type { CellContextMenuEvent } from 'ag-grid-community';

/**
 * Shared state + handlers for cell- and header-context-menu events.
 *
 * Both `DynamicTable` and `QuickQueryTable` use exactly this pattern:
 * - track the current context menu event so an external menu component
 *   (e.g. `RawQueryContextMenu`, `QuickQueryContextMenu`) can read it
 * - auto-select the right-clicked row when no rows are selected yet
 * - expose a `clear` function the consumer calls after the menu closes
 */
export const useDataGridContextMenu = (options: {
  hasSelectedRows: () => boolean;
}) => {
  const cellContextMenu = ref<CellContextMenuEvent | undefined>();
  const cellHeaderContextMenu = ref<CellContextMenuEvent | undefined>();

  const onCellContextMenu = (event: CellContextMenuEvent) => {
    if (!options.hasSelectedRows()) {
      event?.node?.setSelected(true);
    }

    cellContextMenu.value = event;
  };

  const onCellHeaderContextMenu = (event: CellContextMenuEvent) => {
    cellHeaderContextMenu.value = event;
  };

  const clearCellContextMenu = () => {
    cellContextMenu.value = undefined;
    cellHeaderContextMenu.value = undefined;
  };

  return {
    cellContextMenu,
    cellHeaderContextMenu,
    onCellContextMenu,
    onCellHeaderContextMenu,
    clearCellContextMenu,
  };
};
