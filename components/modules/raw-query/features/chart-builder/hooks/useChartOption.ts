import { computed, type Ref } from 'vue';
import type { EChartsOption } from 'echarts';
import { ChartType, type DataPoint } from '../types';
import {
  buildLinearOption,
  buildPieOption,
  buildScatterOption,
  buildHeatmapOption,
  buildRadarOption,
  createTheme,
} from '../utils/optionBuilders';

export function useChartOption(
  chartType: Ref<ChartType>,
  xAxisField: Ref<string>,
  yAxisField: Ref<string>,
  valueField: Ref<string>,
  categoryYField: Ref<string>,
  groupByField: Ref<string>,
  showLabels: Ref<boolean>,
  smoothLine: Ref<boolean>,
  chartTitle: Ref<string>,
  isDark: Ref<boolean>,
  processedData: Ref<DataPoint[]>,
  pieData: Ref<{ name: string; value: number }[]>,
  processedHeatmapData: Ref<{
    xData: string[];
    yData: string[];
    data: [number, number, number][];
  }>,
  processedRadarData: Ref<{
    categories: string[];
    values: number[];
    maxVal: number;
  }>
) {
  const chartOption = computed<EChartsOption>(() => {
    const theme = createTheme(isDark.value);
    const type = chartType.value;

    // Pie & Donut
    if (type === ChartType.PIE || type === ChartType.DONUT) {
      return buildPieOption({
        theme,
        data: pieData.value,
        xAxisField: xAxisField.value,
        yAxisField: yAxisField.value,
        showLabels: showLabels.value,
        isDonut: type === ChartType.DONUT,
      });
    }

    // Heatmap
    if (type === ChartType.HEATMAP) {
      const { xData, yData, data } = processedHeatmapData.value;
      return buildHeatmapOption({
        theme,
        xData,
        yData,
        data,
        xAxisField: xAxisField.value,
        categoryYField: categoryYField.value,
        valueField: valueField.value,
        showLabels: showLabels.value,
        chartTitle: chartTitle.value,
      });
    }

    // Radar
    if (type === ChartType.RADAR) {
      const { categories, values, maxVal } = processedRadarData.value;
      return buildRadarOption({
        theme,
        categories,
        values,
        maxVal,
        showLabels: showLabels.value,
        chartTitle: chartTitle.value,
      });
    }

    // Scatter
    if (type === ChartType.SCATTER) {
      return buildScatterOption({
        theme,
        data: processedData.value,
        xAxisField: xAxisField.value,
        yAxisField: yAxisField.value,
        showLabels: showLabels.value,
        chartTitle: chartTitle.value,
      });
    }

    // Linear charts: Line, Bar, Horizontal Bar, Area, Stacked Bar
    return buildLinearOption({
      theme,
      data: processedData.value,
      xAxisField: xAxisField.value,
      yAxisField: yAxisField.value,
      groupByField: groupByField.value,
      showLabels: showLabels.value,
      smoothLine: smoothLine.value,
      chartTitle: chartTitle.value,
      isLine: type === ChartType.LINE,
      isArea: type === ChartType.AREA,
      isStacked: type === ChartType.STACKED_BAR,
      isHorizontal: type === ChartType.HORIZONTAL_BAR,
    });
  });

  return {
    chartOption,
  };
}
