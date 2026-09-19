import {
  AggregationType,
  SortByType,
  type LinearChartParams,
  type PieChartParams,
  type HeatmapChartParams,
  type RadarChartParams,
  type DataPoint,
} from '../types';

export function processLinearChartData({
  rows,
  xAxisField,
  yAxisField,
  groupByField,
  aggregation,
  sortBy = SortByType.NONE,
  limitRows,
}: LinearChartParams): DataPoint[] {
  if (!xAxisField || !rows) return [];

  // Group and accumulate values
  const groups: Record<
    string,
    { x: string; group?: string; values: number[] }
  > = {};

  rows.forEach(row => {
    const xVal = String(row[xAxisField] ?? 'Null');
    const gVal = groupByField
      ? String(row[groupByField] ?? 'Default')
      : undefined;

    let yVal = 0;
    if (aggregation === AggregationType.COUNT) {
      yVal = 1;
    } else if (yAxisField) {
      const parsed = Number(row[yAxisField]);
      yVal = isNaN(parsed) ? 0 : parsed;
    }

    const key = groupByField ? `${xVal}||${gVal}` : xVal;
    if (!groups[key]) {
      groups[key] = {
        x: xVal,
        group: gVal,
        values: [],
      };
    }
    groups[key].values.push(yVal);
  });

  let result: DataPoint[] = Object.values(groups)
    .map(g => {
      let finalY = 0;
      if (aggregation === AggregationType.NONE) {
        return g.values.map(v => ({ x: g.x, y: v, group: g.group }));
      } else if (aggregation === AggregationType.SUM) {
        finalY = g.values.reduce((sum, v) => sum + v, 0);
      } else if (aggregation === AggregationType.COUNT) {
        finalY = g.values.length;
      } else if (aggregation === AggregationType.AVG) {
        const sum = g.values.reduce((sum, v) => sum + v, 0);
        finalY = g.values.length ? sum / g.values.length : 0;
      } else if (aggregation === AggregationType.MIN) {
        finalY = Math.min(...g.values);
      } else if (aggregation === AggregationType.MAX) {
        finalY = Math.max(...g.values);
      }
      return { x: g.x, y: parseFloat(finalY.toFixed(4)), group: g.group };
    })
    .flat();

  // Sorting
  if (sortBy === SortByType.X_ASC) {
    result.sort((a, b) => a.x.localeCompare(b.x));
  } else if (sortBy === SortByType.X_DESC) {
    result.sort((a, b) => b.x.localeCompare(a.x));
  } else if (sortBy === SortByType.Y_ASC) {
    result.sort((a, b) => a.y - b.y);
  } else if (sortBy === SortByType.Y_DESC) {
    result.sort((a, b) => b.y - a.y);
  }

  // Limiting
  if (limitRows) {
    result = result.slice(0, limitRows);
  }

  return result;
}

export function processPieChartData({
  rows,
  xAxisField,
  yAxisField,
  aggregation,
  sortBy = SortByType.NONE,
  limitRows,
}: PieChartParams): { name: string; value: number }[] {
  if (!xAxisField || !rows) return [];

  const groups: Record<string, number[]> = {};
  rows.forEach(row => {
    const xVal = String(row[xAxisField] ?? 'Null');
    let yVal = 0;
    if (aggregation === AggregationType.COUNT) {
      yVal = 1;
    } else if (yAxisField) {
      const parsed = Number(row[yAxisField]);
      yVal = isNaN(parsed) ? 0 : parsed;
    }
    if (!groups[xVal]) groups[xVal] = [];
    groups[xVal].push(yVal);
  });

  let result = Object.entries(groups).map(([x, values]) => {
    let finalY = 0;
    if (
      aggregation === AggregationType.NONE ||
      aggregation === AggregationType.SUM
    ) {
      finalY = values.reduce((sum, v) => sum + v, 0);
    } else if (aggregation === AggregationType.COUNT) {
      finalY = values.length;
    } else if (aggregation === AggregationType.AVG) {
      const sum = values.reduce((sum, v) => sum + v, 0);
      finalY = values.length ? sum / values.length : 0;
    } else if (aggregation === AggregationType.MIN) {
      finalY = Math.min(...values);
    } else if (aggregation === AggregationType.MAX) {
      finalY = Math.max(...values);
    }
    return { name: x, value: parseFloat(finalY.toFixed(4)) };
  });

  // Sorting
  if (sortBy === SortByType.X_ASC) {
    result.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === SortByType.X_DESC) {
    result.sort((a, b) => b.name.localeCompare(a.name));
  } else if (sortBy === SortByType.Y_ASC) {
    result.sort((a, b) => a.value - b.value);
  } else if (sortBy === SortByType.Y_DESC) {
    result.sort((a, b) => b.value - a.value);
  }

  if (limitRows) {
    result = result.slice(0, limitRows);
  }

  return result;
}

export function processHeatmapChartData({
  rows,
  xAxisField,
  categoryYField,
  valueField,
}: HeatmapChartParams): {
  xData: string[];
  yData: string[];
  data: [number, number, number][];
} {
  if (!xAxisField || !categoryYField || !rows) {
    return { xData: [], yData: [], data: [] };
  }

  const xSet = new Set<string>();
  const ySet = new Set<string>();
  const valueMap = new Map<string, number>();

  rows.forEach(row => {
    const xVal = String(row[xAxisField] ?? 'Null');
    const yVal = String(row[categoryYField] ?? 'Null');
    const val = valueField ? Number(row[valueField] ?? 0) : 1;

    xSet.add(xVal);
    ySet.add(yVal);

    const key = `${xVal}||${yVal}`;
    valueMap.set(key, (valueMap.get(key) || 0) + (isNaN(val) ? 0 : val));
  });

  const xData = Array.from(xSet);
  const yData = Array.from(ySet);
  const data: [number, number, number][] = [];

  xData.forEach((x, xIdx) => {
    yData.forEach((y, yIdx) => {
      const key = `${x}||${y}`;
      if (valueMap.has(key)) {
        data.push([xIdx, yIdx, parseFloat(valueMap.get(key)!.toFixed(2))]);
      } else {
        data.push([xIdx, yIdx, 0]);
      }
    });
  });

  return { xData, yData, data };
}

export function processRadarChartData({
  rows,
  xAxisField,
  yAxisField,
  aggregation,
  limitRows,
}: RadarChartParams): {
  categories: string[];
  values: number[];
  maxVal: number;
} {
  if (!xAxisField || !rows) return { categories: [], values: [], maxVal: 1 };

  const groups: Record<string, number[]> = {};
  rows.forEach(row => {
    const xVal = String(row[xAxisField] ?? 'Null');
    let yVal = 0;
    if (aggregation === AggregationType.COUNT) {
      yVal = 1;
    } else if (yAxisField) {
      const parsed = Number(row[yAxisField]);
      yVal = isNaN(parsed) ? 0 : parsed;
    }
    if (!groups[xVal]) groups[xVal] = [];
    groups[xVal].push(yVal);
  });

  let result = Object.entries(groups).map(([x, values]) => {
    let finalY = 0;
    if (
      aggregation === AggregationType.NONE ||
      aggregation === AggregationType.SUM
    ) {
      finalY = values.reduce((sum, v) => sum + v, 0);
    } else if (aggregation === AggregationType.COUNT) {
      finalY = values.length;
    } else if (aggregation === AggregationType.AVG) {
      const sum = values.reduce((sum, v) => sum + v, 0);
      finalY = values.length ? sum / values.length : 0;
    } else if (aggregation === AggregationType.MIN) {
      finalY = Math.min(...values);
    } else if (aggregation === AggregationType.MAX) {
      finalY = Math.max(...values);
    }
    return { name: x, value: parseFloat(finalY.toFixed(4)) };
  });

  if (limitRows) {
    result = result.slice(0, limitRows);
  }

  const categories = result.map(r => r.name);
  const values = result.map(r => r.value);
  const maxVal = Math.max(...values, 1) * 1.1;

  return { categories, values, maxVal };
}
