<script setup lang="ts">
import { DynamicTable } from '#components';
import type { ColDef } from 'ag-grid-community';
import type { ExplainPlanNode } from '../../../../interfaces/explainAnalyzeResult';
import ExplainOperationCell from './ExplainOperationCell.vue';
import {
  mapGridRowsToTableRows,
  mapPlanNodesToGridRows,
} from './utils/explainGrid.utils';

// ── Props ──────────────────────────────────────────────────────────────────
const props = defineProps<{ nodes: ExplainPlanNode[] }>();

// ── Row data ───────────────────────────────────────────────────────────────
const gridRows = computed(() => mapPlanNodesToGridRows(props.nodes));
const tableRows = computed(() => mapGridRowsToTableRows(gridRows.value));

// ── Column defs ────────────────────────────────────────────────────────────
const columnDefs = computed<ColDef[]>(() => [
  {
    headerName: '#',
    field: 'orderLabel',
    width: 30,
    sortable: true,
    resizable: true,
    filter: false,
    cellClass: 'cellCenter',
  },
  {
    headerName: 'Operation',
    field: 'operationLabel', // value unused – renderer reads `data.*`
    width: 350,
    sortable: false,
    resizable: true,
    filter: true,
    cellRenderer: 'ExplainOperationCell',
    cellClass: 'operation-cell',
    // Provide text for clipboard / filter
    valueGetter: params =>
      `${params.data.treePrefix}${params.data.nodeType} ${params.data.contextLabel}`,
  },
  {
    headerName: 'Status',
    field: 'statusLabel',
    width: 96,
    sortable: true,
    resizable: true,
    filter: true,
    cellClass: params => {
      const v = params.value;
      if (v === 'slowest') return 'cellCenter bg-red-300! dark:bg-red-900';
      if (v === 'expensive')
        return 'cellCenter bg-orange-100! dark:bg-orange-900';
      return 'cellCenter';
    },
  },
  {
    headerName: 'Time Spent',
    field: 'timeSpentLabel',
    width: 110,
    sortable: true,
    resizable: true,
    filter: true,
    cellClass: 'cellCenter ',
  },
  {
    headerName: '% of Query',
    field: 'queryPercentLabel',
    width: 96,
    sortable: true,
    resizable: true,
    filter: true,
    cellClass: 'cellCenter ',
  },
  {
    headerName: 'Actual Rows',
    field: 'rowsLabel',
    width: 96,
    sortable: true,
    resizable: true,
    filter: true,
    cellClass: 'cellCenter ',
  },
  {
    headerName: 'Plan Rows',
    field: 'planRowsLabel',
    width: 88,
    sortable: true,
    resizable: true,
    filter: true,
    cellClass: 'cellCenter ',
  },
  {
    headerName: 'Estim',
    field: 'estimateLabel',
    width: 76,
    sortable: true,
    resizable: true,
    filter: true,
    cellClass: params => {
      const ratio = Number(params.data?.estimateRatioValue);
      if (!Number.isFinite(ratio)) return 'cellCenter ';
      if (ratio < 0.1 || ratio > 10)
        return 'cellCenter  bg-red-200 dark:bg-red-900';
      if ((ratio >= 0.1 && ratio < 0.5) || (ratio > 2 && ratio <= 10))
        return 'cellCenter  bg-orange-100 dark:bg-orange-900';
      return 'cellCenter ';
    },
  },
  {
    headerName: 'Cost',
    field: 'costLabel',
    width: 88,
    sortable: true,
    resizable: true,
    filter: true,
    cellClass: 'cellCenter ',
  },
  {
    headerName: 'Hit Read Ratio',
    field: 'hitReadRatioLabel',
    width: 110,
    sortable: true,
    resizable: true,
    filter: true,
    cellClass: 'cellCenter ',
  },
  {
    headerName: 'Width',
    field: 'widthLabel',
    width: 72,
    sortable: true,
    resizable: true,
    filter: true,
    cellClass: 'cellCenter ',
  },
  {
    headerName: 'Loops',
    field: 'loopsLabel',
    width: 72,
    sortable: true,
    resizable: true,
    filter: true,
    cellClass: 'cellCenter ',
  },
]);

const externalComponents = {
  ExplainOperationCell,
};
</script>

<template>
  <div class="h-full p-2">
    <DynamicTable
      class="h-full"
      :columns="[]"
      :data="[]"
      column-key-by="index"
      skip-re-column-size
      :has-hash-index="false"
      :override-column-defs="columnDefs"
      :override-row-data="tableRows"
      :external-components="externalComponents"
    />
  </div>
</template>

<style>
/* Essential AG Grid overrides to ensure Operation column content fits properly */
.operation-cell .ag-cell-value {
  overflow: visible !important;
  width: 100%;
}
.operation-cell .ag-cell-wrapper {
  width: 100%;
}
</style>
