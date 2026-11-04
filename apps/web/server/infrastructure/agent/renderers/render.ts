import type {
  AgentChartType,
  AgentRenderTableResult,
  AgentVisualizePoint,
  AgentVisualizeTableResult,
} from '~/components/modules/agent/types';
import {
  clampLimit,
  isSelectLikeSql,
  MAX_RENDER_LIMIT,
  normalizeSql,
  resolveFieldType,
} from '../core/sql';
import type {
  DatabaseAdapter,
  QueryField,
  QueryRowRecord,
  RawQueryResult,
} from '../core/types';

export function rowsToRecords(
  rows: unknown[],
  fields: QueryField[] = []
): QueryRowRecord[] {
  return rows.map(row => {
    if (Array.isArray(row)) {
      return row.reduce<QueryRowRecord>((record, value, index) => {
        const name = fields[index]?.name || `column_${index + 1}`;
        record[name] = value;
        return record;
      }, {});
    }

    return (row || {}) as QueryRowRecord;
  });
}

export function getCountFromRows(rows: QueryRowRecord[]) {
  const firstRow = rows[0];
  if (!firstRow) {
    return 0;
  }

  const countValue = Object.values(firstRow)[0];
  const parsed = Number(countValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const isNumericColumn = (rows: QueryRowRecord[], key: string) =>
  rows.some(row => toFiniteNumber(row[key]) !== null);

const inferLabelField = (rows: QueryRowRecord[], keys: string[]) =>
  keys.find(key => !isNumericColumn(rows, key)) || keys[0] || null;

const buildSeriesPoints = (
  rows: QueryRowRecord[],
  labelField: string,
  valueField: string
): AgentVisualizePoint[] => {
  const points: AgentVisualizePoint[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const value = toFiniteNumber(row[valueField]);
    if (value === null) {
      continue;
    }

    const rawLabel = row[labelField];
    const label =
      rawLabel === null || typeof rawLabel === 'undefined' || rawLabel === ''
        ? `Row ${index + 1}`
        : String(rawLabel);

    points.push({
      label,
      x: label,
      y: value,
    });
  }

  return points;
};

const buildScatterPoints = (
  rows: QueryRowRecord[],
  xField: string,
  yField: string,
  labelField: string | null
): AgentVisualizePoint[] => {
  const points: AgentVisualizePoint[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const xValue = toFiniteNumber(row[xField]);
    const yValue = toFiniteNumber(row[yField]);

    if (xValue === null || yValue === null) {
      continue;
    }

    const rawLabel = labelField ? row[labelField] : null;
    const label =
      rawLabel === null || typeof rawLabel === 'undefined' || rawLabel === ''
        ? `Point ${index + 1}`
        : String(rawLabel);

    points.push({
      label,
      x: xValue,
      y: yValue,
    });
  }

  return points;
};

export async function visualizeTableResult(
  adapter: DatabaseAdapter,
  sql: string,
  chartType: AgentChartType
): Promise<AgentVisualizeTableResult> {
  const normalizedSql = normalizeSql(sql);

  if (!normalizedSql) {
    throw new Error('SQL is required.');
  }

  if (!isSelectLikeSql(normalizedSql)) {
    throw new Error('Only read-only SELECT queries can be visualized.');
  }

  const safeLimit = Math.min(MAX_RENDER_LIMIT, 50);
  const wrappedSql = `SELECT * FROM (${normalizedSql}) AS agent_chart_result LIMIT ${safeLimit + 1}`;
  const result = (await adapter.rawOut(wrappedSql)) as RawQueryResult;
  const rows = rowsToRecords(result.rows || [], result.fields || []);
  const truncated = rows.length > safeLimit;
  const visibleRows = truncated ? rows.slice(0, safeLimit) : rows;
  const keys = (result.fields || []).map(field => field.name || 'unknown');

  if (visibleRows.length === 0 || keys.length === 0) {
    throw new Error(
      'No rows returned. Try a query with grouped or measurable data.'
    );
  }

  if (chartType === 'scatter') {
    const numericKeys = keys.filter(key => isNumericColumn(visibleRows, key));
    if (numericKeys.length < 2) {
      throw new Error('Scatter charts require at least two numeric columns.');
    }

    const xField = numericKeys[0];
    const yField = numericKeys[1];
    const labelField = inferLabelField(
      visibleRows,
      keys.filter(key => key !== xField && key !== yField)
    );
    const points = buildScatterPoints(visibleRows, xField, yField, labelField);

    if (points.length === 0) {
      throw new Error(
        'Could not build scatter chart points from the query result.'
      );
    }

    return {
      sql: normalizedSql,
      chartType,
      xField,
      yField,
      labelField: labelField || undefined,
      points,
      rowCount: points.length,
      truncated,
    };
  }

  const labelField = inferLabelField(visibleRows, keys);
  if (!labelField) {
    throw new Error('Could not infer a label column for the chart.');
  }

  const valueField = keys.find(
    key => key !== labelField && isNumericColumn(visibleRows, key)
  );

  if (!valueField) {
    throw new Error(
      'This chart needs at least one numeric column in the result.'
    );
  }

  const points = buildSeriesPoints(visibleRows, labelField, valueField);
  if (points.length === 0) {
    throw new Error('Could not build chart points from the query result.');
  }

  return {
    sql: normalizedSql,
    chartType,
    xField: labelField,
    yField: valueField,
    labelField,
    points,
    rowCount: points.length,
    truncated,
  };
}

export async function renderTableResult(
  adapter: DatabaseAdapter,
  sql: string,
  limit: number
): Promise<AgentRenderTableResult> {
  const normalizedSql = normalizeSql(sql);

  if (!normalizedSql) {
    throw new Error('SQL is required.');
  }

  if (!isSelectLikeSql(normalizedSql)) {
    const mutationResult = (await adapter.rawOut(
      normalizedSql
    )) as RawQueryResult;

    return {
      sql: normalizedSql,
      columns: [
        { name: 'operation', type: 'text' },
        { name: 'affected_rows', type: 'integer' },
      ],
      rows: [
        {
          operation: mutationResult.command || 'MUTATION',
          affected_rows: mutationResult.rowCount || 0,
        },
      ],
      rowCount: 1,
      truncated: false,
    };
  }

  const safeLimit = clampLimit(limit);
  const wrappedSql = `SELECT * FROM (${normalizedSql}) AS agent_result LIMIT ${safeLimit + 1}`;
  const result = (await adapter.rawOut(wrappedSql)) as RawQueryResult;
  const rows = rowsToRecords(result.rows || [], result.fields || []);
  const truncated = rows.length > safeLimit;
  const visibleRows = truncated ? rows.slice(0, safeLimit) : rows;

  return {
    sql: normalizedSql,
    columns: (result.fields || []).map(field => ({
      name: field.name || 'unknown',
      type: resolveFieldType(field),
    })),
    rows: visibleRows,
    rowCount: visibleRows.length,
    truncated,
  };
}
