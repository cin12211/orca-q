import { mount } from '@vue/test-utils';
import type { ColDef, GridOptions } from 'ag-grid-community';
import { describe, expect, it } from 'vitest';
import BaseDataGrid from '~/components/base/data-grid/BaseDataGrid.vue';
import BaseDataGridEmptyOverlay from '~/components/base/data-grid/components/BaseDataGridEmptyOverlay.vue';

const columnDefs = [{ headerName: 'Name', field: 'name' }];

const mountGrid = (
  rowData: Array<Record<string, unknown>>,
  props: Record<string, unknown> = {}
) =>
  mount(BaseDataGrid, {
    props: {
      columnDefs,
      rowData,
      enableCopyHotkey: false,
      ...props,
    },
    global: {
      stubs: {
        AgGridVue: {
          name: 'AgGridVue',
          props: ['columnDefs', 'gridOptions', 'rowData'],
          template: '<div data-test="ag-grid" />',
        },
        BaseEmpty: {
          name: 'BaseEmpty',
          props: ['title', 'desc'],
          template:
            '<div data-test="base-empty"><span>{{ title }}</span><span>{{ desc }}</span></div>',
        },
      },
    },
  });

describe('BaseDataGrid', () => {
  it('keeps AG Grid mounted and configures the no-rows overlay when row data is empty', () => {
    const wrapper = mountGrid([]);
    const agGrid = wrapper.getComponent({ name: 'AgGridVue' });
    const gridOptions = agGrid.props('gridOptions') as GridOptions;

    expect(agGrid.props('rowData')).toEqual([]);
    expect(gridOptions.noRowsOverlayComponent).toBe('BaseDataGridEmptyOverlay');
    expect(gridOptions.noRowsOverlayComponentParams).toEqual({
      title: 'No data found',
      description: 'There are no rows to display.',
    });
    expect(gridOptions.components).toHaveProperty('BaseDataGridEmptyOverlay');
  });

  it('renders AG Grid when row data has rows', () => {
    const wrapper = mountGrid([{ name: 'OrcaQ' }]);

    expect(wrapper.find('[data-test="ag-grid"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="base-empty"]').exists()).toBe(false);
  });

  it('passes custom empty text into the no-rows overlay params', () => {
    const wrapper = mountGrid([], {
      emptyTitle: 'No matching rows',
      emptyDescription: 'Adjust filters or run another query.',
    });
    const gridOptions = wrapper
      .getComponent({ name: 'AgGridVue' })
      .props('gridOptions') as GridOptions;

    expect(gridOptions.noRowsOverlayComponentParams).toEqual({
      title: 'No matching rows',
      description: 'Adjust filters or run another query.',
    });
  });

  it('forces columns to read-only by default', () => {
    const wrapper = mountGrid([{ name: 'OrcaQ' }], {
      columnDefs: [{ headerName: 'Name', field: 'name', editable: true }],
    });
    const agGrid = wrapper.getComponent({ name: 'AgGridVue' });
    const effectiveColumnDefs = agGrid.props('columnDefs') as ColDef[];
    const gridOptions = agGrid.props('gridOptions') as GridOptions;

    expect(effectiveColumnDefs[0].editable).toBe(false);
    expect(gridOptions.undoRedoCellEditing).toBe(false);
  });

  it('preserves caller editability when explicitly enabled', () => {
    const editable = () => true;
    const wrapper = mountGrid([{ name: 'OrcaQ' }], {
      allowEditing: true,
      columnDefs: [{ headerName: 'Name', field: 'name', editable }],
    });
    const agGrid = wrapper.getComponent({ name: 'AgGridVue' });
    const effectiveColumnDefs = agGrid.props('columnDefs') as ColDef[];
    const gridOptions = agGrid.props('gridOptions') as GridOptions;

    expect(effectiveColumnDefs[0].editable).toBe(editable);
    expect(gridOptions.undoRedoCellEditing).toBe(true);
  });
});

describe('BaseDataGridEmptyOverlay', () => {
  it('renders BaseEmpty with AG Grid overlay params', () => {
    const wrapper = mount(BaseDataGridEmptyOverlay, {
      props: {
        params: {
          title: 'No matching rows',
          description: 'Adjust filters or run another query.',
        },
      },
      global: {
        stubs: {
          BaseEmpty: {
            name: 'BaseEmpty',
            props: ['title', 'desc'],
            template:
              '<div data-test="base-empty"><span>{{ title }}</span><span>{{ desc }}</span></div>',
          },
        },
      },
    });

    expect(wrapper.find('[data-test="base-empty"]').text()).toContain(
      'No matching rows'
    );
    expect(wrapper.find('[data-test="base-empty"]').text()).toContain(
      'Adjust filters or run another query.'
    );
  });
});
