import { createPinia, setActivePinia } from 'pinia';
import { computed, markRaw, ref } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3';
import type {
  CellValueChangedEvent,
  ColDef,
  GridApi,
  GridOptions,
} from 'ag-grid-community';
import { useAppConfigStore } from '~/core/stores/appConfigStore';
import BaseDataGrid from './BaseDataGrid.vue';
import DataGridRelationCell from './components/cell-renderers/DataGridRelationCell.vue';
import DataGridKeyHeader from './headers/DataGridKeyHeader.vue';

type DemoPlan = 'Starter' | 'Pro' | 'Enterprise';
type DemoStatus = 'Active' | 'Invited' | 'Paused';

interface DemoRow {
  customer_id: string;
  email: string;
  plan: DemoPlan;
  owner_id: string;
  status: DemoStatus;
  updated_at: string;
  notes: string;
}

const pinia = createPinia();
setActivePinia(pinia);

const appConfigStore = useAppConfigStore();

Object.assign(appConfigStore.tableAppearanceConfigs, {
  fontSize: 13,
  rowHeight: 40,
  cellSpacing: 8,
  headerFontSize: 13,
  headerFontWeight: 600,
});

const planOptions: DemoPlan[] = ['Starter', 'Pro', 'Enterprise'];
const statusOptions: DemoStatus[] = ['Active', 'Invited', 'Paused'];

const buildDemoRows = (): DemoRow[] => {
  return Array.from({ length: 36 }, (_, index) => ({
    customer_id: `CUS-${String(index + 1).padStart(3, '0')}`,
    email: `team${index + 1}@heraq.dev`,
    plan: planOptions[index % planOptions.length],
    owner_id: `USR-${String((index % 9) + 1).padStart(3, '0')}`,
    status: statusOptions[index % statusOptions.length],
    updated_at: `2026-05-${String((index % 28) + 1).padStart(2, '0')} 10:${String(index % 60).padStart(2, '0')}`,
    notes:
      index % 2 === 0
        ? 'Editable cell to demo quick inline changes.'
        : 'Right click cells or headers to open the built-in copy menu.',
  }));
};

const meta = {
  title: 'Base/DataGrid/BaseDataGrid',
  component: BaseDataGrid,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    autoScrollOnSelection: { control: 'boolean' },
    enableSimpleCopyContextMenu: { control: 'boolean' },
    enableCopyHotkey: { control: 'boolean' },
    enableClickOutside: { control: 'boolean' },
    allowEditing: { control: 'boolean' },
    suppressScrollOnNewData: { control: 'boolean' },
    copyHeadersToClipboard: { control: 'boolean' },
    emptyTitle: { control: 'text' },
    emptyDescription: { control: 'text' },
  },
} satisfies Meta<typeof BaseDataGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

const simpleUsageArgs = {
  columnDefs: [],
  rowData: [],
  autoScrollOnSelection: true,
  enableSimpleCopyContextMenu: true,
  enableCopyHotkey: true,
  enableClickOutside: true,
  allowEditing: false,
  suppressScrollOnNewData: true,
  copyHeadersToClipboard: false,
  emptyTitle: 'No data found',
  emptyDescription: 'There are no rows to display.',
} satisfies Story['args'];

export const SimpleUsage: Story = {
  args: simpleUsageArgs,
  render: args => ({
    components: { BaseDataGrid },
    setup() {
      const gridRef = ref<{ gridApi?: GridApi | null } | null>(null);
      const rowData = ref<DemoRow[]>(buildDemoRows());
      const selectedRows = ref<DemoRow[]>([]);
      const lastFocusedCell = ref('Nothing focused yet');
      const lastCellChange = ref('No edits yet');
      const lastRelationPreview = ref('No relation preview opened');

      const keyHeader = markRaw(DataGridKeyHeader);
      const relationCell = markRaw(DataGridRelationCell);

      const selectedPreview = computed(() => {
        if (!selectedRows.value.length) {
          return 'No rows selected yet.';
        }

        return JSON.stringify(selectedRows.value[0], null, 2);
      });

      const gridOptions: GridOptions = {
        defaultColDef: {
          flex: 1,
          minWidth: 140,
          filter: true,
          resizable: true,
          sortable: true,
        },
        singleClickEdit: true,
        stopEditingWhenCellsLoseFocus: true,
      };

      const columnDefs = computed<ColDef[]>(() => [
        {
          headerName: '#',
          colId: 'row_index',
          maxWidth: 88,
          pinned: 'left',
          sortable: false,
          filter: false,
          suppressMovable: true,
          valueGetter: params => (params.node?.rowIndex ?? 0) + 1,
        },
        {
          headerName: 'Customer ID',
          field: 'customer_id',
          editable: false,
          minWidth: 150,
          headerComponentParams: {
            innerHeaderComponent: keyHeader,
            isPrimaryKey: true,
            isForeignKey: false,
          },
        },
        {
          headerName: 'Email',
          field: 'email',
          editable: true,
          minWidth: 220,
        },
        {
          headerName: 'Plan',
          field: 'plan',
          editable: true,
          minWidth: 160,
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: {
            values: planOptions,
          },
        },
        {
          headerName: 'Owner ID',
          field: 'owner_id',
          editable: false,
          minWidth: 170,
          headerComponentParams: {
            innerHeaderComponent: keyHeader,
            isPrimaryKey: false,
            isForeignKey: true,
          },
          cellRenderer: relationCell,
          cellRendererParams: {
            isPrimaryKey: true,
            onOpenPreviewReverseTableModal: (id: string) => {
              lastRelationPreview.value = `Open reverse relation preview for ${id}`;
            },
          },
        },
        {
          headerName: 'Status',
          field: 'status',
          editable: true,
          minWidth: 150,
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: {
            values: statusOptions,
          },
        },
        {
          headerName: 'Updated At',
          field: 'updated_at',
          editable: false,
          minWidth: 190,
        },
        {
          headerName: 'Notes',
          field: 'notes',
          editable: true,
          minWidth: 280,
        },
      ]);

      const onSelectionChanged = (rows: unknown[]) => {
        selectedRows.value = rows as DemoRow[];
      };

      const onCellFocused = (value: unknown | undefined) => {
        lastFocusedCell.value =
          value === undefined || value === null
            ? 'Nothing focused yet'
            : String(value);
      };

      const onCellValueChanged = (event: CellValueChangedEvent) => {
        lastCellChange.value = `${String(event.colDef.field ?? 'unknown')}: ${String(event.oldValue ?? '')} -> ${String(event.newValue ?? '')}`;
      };

      const focusLastRow = () => {
        const gridApi = gridRef.value?.gridApi as GridApi | null | undefined;
        const lastRowIndex = rowData.value.length - 1;

        if (!gridApi || lastRowIndex < 0) {
          return;
        }

        gridApi.getDisplayedRowAtIndex(lastRowIndex)?.setSelected(true, true);
        gridApi.setFocusedCell(lastRowIndex, 'email');
      };

      const resetRows = () => {
        rowData.value = buildDemoRows();
        selectedRows.value = [];
        lastFocusedCell.value = 'Nothing focused yet';
        lastCellChange.value = 'No edits yet';
        lastRelationPreview.value = 'No relation preview opened';
      };

      const clearRows = () => {
        rowData.value = [];
        selectedRows.value = [];
        lastFocusedCell.value = 'Nothing focused yet';
      };

      const onClickOutside = () => {
        lastFocusedCell.value = 'Focus moved outside the grid';
      };

      return {
        args,
        clearRows,
        columnDefs,
        focusLastRow,
        gridOptions,
        gridRef,
        lastCellChange,
        lastFocusedCell,
        lastRelationPreview,
        onCellFocused,
        onCellValueChanged,
        onClickOutside,
        onSelectionChanged,
        resetRows,
        rowData,
        selectedPreview,
        selectedRows,
      };
    },
    template: `
      <div class="min-h-screen bg-background p-6">
        <div class="mx-auto flex max-w-[1480px] flex-col gap-4">
          <section class="rounded-xl border bg-card p-4 shadow-sm">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div class="space-y-1">
                <h2 class="text-lg font-semibold">BaseDataGrid simple usage</h2>
                <p class="text-sm text-muted-foreground">
                  Demo này dùng chế độ view-only mặc định, built-in copy context menu,
                  shared key header, shared relation cell và auto scroll khi focus/select một row ở xa.
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                  @click="focusLastRow"
                >
                  Focus last row
                </button>
                <button
                  type="button"
                  class="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                  @click="resetRows"
                >
                  Reset demo data
                </button>
                <button
                  type="button"
                  class="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                  @click="clearRows"
                >
                  Clear rows
                </button>
              </div>
            </div>
          </section>

          <section class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div class="h-[680px] overflow-hidden rounded-xl border bg-background shadow-sm">
              <BaseDataGrid
                ref="gridRef"
                v-bind="args"
                class="h-full w-full"
                :column-defs="columnDefs"
                :grid-options="gridOptions"
                :row-data="rowData"
                :selected-rows="selectedRows"
                context-menu-table-name="customers"
                context-menu-schema-name="public"
                @selection-changed="onSelectionChanged"
                @cell-focused="onCellFocused"
                @cell-value-changed="onCellValueChanged"
                @click-outside="onClickOutside"
              />
            </div>

            <aside class="flex flex-col gap-4">
              <div class="rounded-xl border bg-card p-4 shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Live status
                </p>
                <dl class="mt-3 space-y-3 text-sm">
                  <div>
                    <dt class="text-muted-foreground">Selected rows</dt>
                    <dd class="font-medium">{{ selectedRows.length }}</dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">Focused value</dt>
                    <dd class="font-medium break-words">{{ lastFocusedCell }}</dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">Last cell change</dt>
                    <dd class="font-medium break-words">{{ lastCellChange }}</dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">Editing</dt>
                    <dd class="font-medium">{{ args.allowEditing ? 'Enabled' : 'View only' }}</dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">Relation preview action</dt>
                    <dd class="font-medium break-words">{{ lastRelationPreview }}</dd>
                  </div>
                </dl>
              </div>

              <div class="rounded-xl border bg-card p-4 shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Try this
                </p>
                <ul class="mt-3 list-disc space-y-2 pl-4 text-sm text-muted-foreground">
                  <li>Select some rows, then right click a cell or a header.</li>
                  <li v-if="args.allowEditing">Edit Email, Plan, Status, or Notes to see emitted cell changes.</li>
                  <li v-else>Double click editable-looking cells to confirm the shared grid stays read-only.</li>
                  <li>Click the eye icon in Owner ID to exercise the shared relation cell.</li>
                  <li>Use “Focus last row” to confirm long tables stay in view.</li>
                </ul>
              </div>

              <div class="rounded-xl border bg-card p-4 shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  First selected row
                </p>
                <pre class="mt-3 overflow-auto rounded-md bg-muted p-3 text-xs leading-5">{{ selectedPreview }}</pre>
              </div>
            </aside>
          </section>
        </div>
      </div>
    `,
  }),
};

export const EditingEnabled: Story = {
  ...SimpleUsage,
  name: 'Editing enabled',
  args: {
    ...simpleUsageArgs,
    allowEditing: true,
  },
};

export const EmptyState: Story = {
  args: {
    columnDefs: [],
    rowData: [],
    autoScrollOnSelection: true,
    enableSimpleCopyContextMenu: false,
    enableCopyHotkey: true,
    enableClickOutside: false,
    allowEditing: false,
    suppressScrollOnNewData: true,
    copyHeadersToClipboard: false,
    emptyTitle: 'No matching rows',
    emptyDescription:
      'Adjust filters or run another query to populate the grid.',
  },
  render: args => ({
    components: { BaseDataGrid },
    setup() {
      const columnDefs: ColDef[] = [
        { headerName: 'Customer ID', field: 'customer_id' },
        { headerName: 'Email', field: 'email' },
        { headerName: 'Plan', field: 'plan' },
      ];

      return {
        args,
        columnDefs,
      };
    },
    template: `
      <div class="min-h-screen bg-background p-6">
        <div class="mx-auto h-[520px] max-w-[960px] overflow-hidden rounded-xl border bg-background shadow-sm">
          <BaseDataGrid
            v-bind="args"
            class="h-full w-full"
            :column-defs="columnDefs"
            :row-data="[]"
          />
        </div>
      </div>
    `,
  }),
};
