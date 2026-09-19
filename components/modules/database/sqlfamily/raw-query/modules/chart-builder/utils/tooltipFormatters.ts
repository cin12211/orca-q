/**
 * Per-chart-type tooltip formatters for ECharts.
 * Extracted from useChartOption to allow per-type customisation and
 * number-formatting without bloating the option builder.
 */

// ─── Shared Helpers ────────────────────────────────────────────────

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatNumber = (value: number): string => {
  if (Number.isInteger(value)) return value.toLocaleString();
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const tooltipRow = (
  label: string,
  value: unknown,
  options?: { bold?: boolean; colorDot?: string }
): string => {
  const formatted =
    typeof value === 'number' ? formatNumber(value) : escapeHtml(value);

  const dotHtml = options?.colorDot
    ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${options.colorDot};margin-right:6px;"></span>`
    : '';

  const valueStyle = options?.bold ? 'font-weight:600;' : '';

  return `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;font-weight:400;line-height:1.7;">
    <span style="opacity:.72;">${dotHtml}${escapeHtml(label)}</span>
    <span style="${valueStyle}">${formatted}</span>
  </div>`;
};

const tooltipWrapper = (rows: string[]): string =>
  `<div style="min-width:140px;">${rows.join('')}</div>`;

// ─── Per-Type Formatters ───────────────────────────────────────────

/**
 * Linear charts: Line, Bar, Horizontal Bar, Area.
 * Trigger: axis — shows crosshair with all series at that x position.
 */
export function formatLinearTooltip(
  params: any,
  xLabel: string,
  yLabel: string,
  groupByField: string
): string {
  const items = Array.isArray(params) ? params : [params];
  const firstItem = items[0] ?? {};
  const axisLabel =
    firstItem.axisValueLabel ?? firstItem.axisValue ?? firstItem.name ?? '';

  const rows = [tooltipRow(xLabel || 'X', axisLabel)];

  items.forEach((item: any) => {
    const value = Array.isArray(item.data)
      ? item.data[1]
      : (item.value ?? item.data);

    if (groupByField && item.seriesName) {
      rows.push(
        tooltipRow(String(item.seriesName), value, {
          colorDot: item.color,
        })
      );
    } else {
      rows.push(tooltipRow(yLabel || 'Value', value));
    }
  });

  return tooltipWrapper(rows);
}

/**
 * Stacked Bar chart.
 * Same as linear but adds a total row at the bottom.
 */
export function formatStackedBarTooltip(params: any, xLabel: string): string {
  const items = Array.isArray(params) ? params : [params];
  const firstItem = items[0] ?? {};
  const axisLabel =
    firstItem.axisValueLabel ?? firstItem.axisValue ?? firstItem.name ?? '';

  const rows = [tooltipRow(xLabel || 'Category', axisLabel)];
  let total = 0;

  items.forEach((item: any) => {
    const value = Array.isArray(item.data)
      ? item.data[1]
      : (item.value ?? item.data);
    const numVal = typeof value === 'number' ? value : Number(value) || 0;
    total += numVal;
    rows.push(
      tooltipRow(String(item.seriesName ?? ''), value, {
        colorDot: item.color,
      })
    );
  });

  rows.push(tooltipRow('Total', total, { bold: true }));

  return tooltipWrapper(rows);
}

/**
 * Pie & Donut charts.
 * Trigger: item — shows category, value, and percentage.
 */
export function formatPieTooltip(
  params: any,
  categoryLabel: string,
  valueLabel: string
): string {
  const rows = [
    tooltipRow(categoryLabel || 'Category', params.name, {
      colorDot: params.color,
    }),
    tooltipRow(valueLabel || 'Value', params.value),
    tooltipRow('Percent', `${params.percent}%`, { bold: true }),
  ];
  return tooltipWrapper(rows);
}

/**
 * Scatter chart.
 * Trigger: item — shows X and Y coordinate values.
 */
export function formatScatterTooltip(
  params: any,
  xLabel: string,
  yLabel: string
): string {
  const data = params.data ?? [];
  const rows = [
    tooltipRow(xLabel || 'X', data[0]),
    tooltipRow(yLabel || 'Y', data[1]),
  ];
  return tooltipWrapper(rows);
}

/**
 * Heatmap chart.
 * Trigger: item — shows X category, Y category, and cell value.
 */
export function formatHeatmapTooltip(
  params: any,
  xData: string[],
  yData: string[],
  xLabel: string,
  yLabel: string,
  valueLabel: string
): string {
  const [xIndex, yIndex, value] = params.data ?? [];
  const rows = [
    tooltipRow(xLabel || 'X', xData[xIndex]),
    tooltipRow(yLabel || 'Y', yData[yIndex]),
    tooltipRow(valueLabel || 'Value', value, { bold: true }),
  ];
  return tooltipWrapper(rows);
}

/**
 * Radar chart.
 * Trigger: item — shows all dimension values.
 */
export function formatRadarTooltip(
  params: any,
  categories: string[],
  values: number[]
): string {
  const rows = categories.map((category, index) =>
    tooltipRow(category, params.value?.[index] ?? values[index])
  );
  return tooltipWrapper(rows);
}
