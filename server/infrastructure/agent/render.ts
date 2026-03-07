import type { AgentRenderTableResult } from '~/components/modules/agent/types';
import {
  clampLimit,
  isSelectLikeSql,
  normalizeSql,
  resolveFieldType,
} from './sql';
import type {
  DatabaseAdapter,
  QueryField,
  QueryRowRecord,
  RawQueryResult,
} from './types';

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
    columns: (result.fields || []).map(field => ({
      name: field.name || 'unknown',
      type: resolveFieldType(field),
    })),
    rows: visibleRows,
    rowCount: visibleRows.length,
    truncated,
  };
}
