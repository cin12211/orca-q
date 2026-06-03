import { ref, watch, type Ref } from 'vue';
import type { ExecutedResultItem, MappedRawColumn } from '../../../interfaces';
import { CHART_TYPE_META } from '../constants';
import { ChartType, AggregationType, SortByType } from '../types';

export function useChartBuilder(
  activeTab: Ref<ExecutedResultItem>,
  activeTabColumns: Ref<MappedRawColumn[]>
) {
  const chartType = ref<ChartType>(ChartType.BAR);
  const xAxisField = ref<string>('');
  const yAxisField = ref<string>('');
  const valueField = ref<string>('');
  const categoryYField = ref<string>('');
  const aggregation = ref<AggregationType>(AggregationType.NONE);
  const groupByField = ref<string>('');
  const sortBy = ref<SortByType>(SortByType.NONE);
  const limitRows = ref<number | null>(null);
  const showLabels = ref<boolean>(false);
  const smoothLine = ref<boolean>(true);
  const chartTitle = ref<string>('');

  const resetConfig = () => {
    chartType.value = ChartType.BAR;
    xAxisField.value = activeTabColumns.value[0]?.queryFieldName || '';
    yAxisField.value = activeTabColumns.value[1]?.queryFieldName || '';
    valueField.value = '';
    categoryYField.value = '';
    aggregation.value = AggregationType.NONE;
    groupByField.value = '';
    sortBy.value = SortByType.NONE;
    limitRows.value = null;
    showLabels.value = false;
    smoothLine.value = true;
    chartTitle.value = `Query ${activeTab.value.seqIndex} Chart`;
  };

  /**
   * When switching chart type, clear fields that don't exist in the new type
   * to avoid stale values causing unexpected chart behavior.
   */
  watch(chartType, (newType, oldType) => {
    if (newType === oldType) return;

    const newMeta = CHART_TYPE_META.get(newType);
    if (!newMeta) return;
    const f = newMeta.fields;

    // Clear Heatmap-specific fields when leaving Heatmap
    if (!f.categoryX) xAxisField.value = xAxisField.value;
    if (!f.categoryY) categoryYField.value = '';
    if (!f.valueColumn) valueField.value = '';

    // Clear groupBy when switching to chart types that don't support it
    if (!f.groupBy) groupByField.value = '';

    // Reset sort when switching to chart types that don't support it
    if (!f.sortBy) sortBy.value = SortByType.NONE;

    // Seed xAxisField from columns if empty after type switch
    const cols = activeTabColumns.value;
    if (!xAxisField.value && cols.length > 0) {
      xAxisField.value = cols[0]?.queryFieldName || '';
    }
  });

  watch(
    activeTabColumns,
    cols => {
      if (cols && cols.length > 0) {
        if (!xAxisField.value) xAxisField.value = cols[0]?.queryFieldName || '';
        if (!yAxisField.value && cols.length > 1) {
          yAxisField.value = cols[1]?.queryFieldName || '';
        }
      }
    },
    { immediate: true }
  );

  watch(
    activeTab,
    tab => {
      chartTitle.value = `Query ${tab.seqIndex} Chart`;
    },
    { immediate: true }
  );

  return {
    chartType,
    xAxisField,
    yAxisField,
    valueField,
    categoryYField,
    aggregation,
    groupByField,
    sortBy,
    limitRows,
    showLabels,
    smoothLine,
    chartTitle,
    resetConfig,
  };
}
