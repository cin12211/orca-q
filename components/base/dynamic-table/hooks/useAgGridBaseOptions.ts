import type { GridOptions } from 'ag-grid-community';
import { baseTableTheme } from '../constants';

//TODO: re usage
export function useAgGridBaseOptions() {
  const options: GridOptions = {
    getRowClass: params => {
      const classes = ['class-row-border-none'];
      if ((params.node.rowIndex || 0) % 2 === 0) {
        classes.push('class-row-even');
      }
      return classes;
    },
    rowSelection: {
      mode: 'multiRow',
      checkboxes: false,
      headerCheckbox: false,
      enableSelectionWithoutKeys: false,
      enableClickSelection: 'enableSelection',
      copySelectedRows: false,
    },
    theme: baseTableTheme,
    undoRedoCellEditing: true,
    undoRedoCellEditingLimit: 25,
    animateRows: true,
  };

  return options;
}
