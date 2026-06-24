import { describe, expect, it } from 'vitest';
import { ComposeOperator, OperatorSet } from '~/core/constants';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  buildWhereClause,
  formatWhereClause,
} from '~/core/helpers/sql-where-clause';

const EQUAL = OperatorSet.EQUAL;
const LIKE_CONTAINS = OperatorSet.LIKE_CONTAINS;

describe('buildWhereClause', () => {
  it('generates @p1 placeholder for MSSQL', () => {
    const { where, params } = buildWhereClause({
      filters: [{ fieldName: 'ChangeArea', operator: EQUAL, search: 'Workflow', isSelect: true }],
      db: DatabaseClientType.MSSQL,
      columns: [],
    });

    expect(where).toBe('WHERE [ChangeArea] = @p1');
    expect(params).toEqual(['Workflow']);
  });

  it('generates $1 placeholder for Postgres', () => {
    const { where, params } = buildWhereClause({
      filters: [{ fieldName: 'id', operator: EQUAL, search: '42', isSelect: true }],
      db: DatabaseClientType.POSTGRES,
      columns: [],
    });

    expect(where).toBe('WHERE "id" = $1');
    expect(params).toEqual(['42']);
  });

  it('generates ? placeholder for MySQL', () => {
    const { where, params } = buildWhereClause({
      filters: [{ fieldName: 'name', operator: EQUAL, search: 'Alice', isSelect: true }],
      db: DatabaseClientType.MYSQL,
      columns: [],
    });

    expect(where).toBe('WHERE `name` = ?');
    expect(params).toEqual(['Alice']);
  });
});

describe('formatWhereClause', () => {
  it('replaces @p1 with literal value for MSSQL', () => {
    const result = formatWhereClause({
      filters: [{ fieldName: 'ChangeArea', operator: EQUAL, search: 'Workflow', isSelect: true }],
      db: DatabaseClientType.MSSQL,
      columns: [],
    });

    expect(result).toBe("WHERE [ChangeArea] = 'Workflow'");
  });

  it('replaces multiple MSSQL @pN placeholders correctly', () => {
    const result = formatWhereClause({
      filters: [
        { fieldName: 'Status', operator: EQUAL, search: 'Active', isSelect: true },
        { fieldName: 'Type', operator: EQUAL, search: 'Admin', isSelect: true },
      ],
      db: DatabaseClientType.MSSQL,
      columns: [],
      composeWith: ComposeOperator.AND,
    });

    expect(result).toBe("WHERE [Status] = 'Active' AND [Type] = 'Admin'");
  });

  it('replaces $1 with literal value for Postgres', () => {
    const result = formatWhereClause({
      filters: [{ fieldName: 'id', operator: EQUAL, search: '42', isSelect: true }],
      db: DatabaseClientType.POSTGRES,
      columns: [],
    });

    expect(result).toBe('WHERE "id" = \'42\'');
  });

  it('replaces ? with literal value for MySQL', () => {
    const result = formatWhereClause({
      filters: [{ fieldName: 'name', operator: EQUAL, search: 'Alice', isSelect: true }],
      db: DatabaseClientType.MYSQL,
      columns: [],
    });

    expect(result).toBe("WHERE `name` = 'Alice'");
  });

  it('returns empty string when no filters are selected', () => {
    const result = formatWhereClause({
      filters: [{ fieldName: 'id', operator: EQUAL, search: '1', isSelect: false }],
      db: DatabaseClientType.MSSQL,
      columns: [],
    });

    expect(result).toBe('');
  });

  it('handles numeric values without quotes in MSSQL', () => {
    const result = formatWhereClause({
      filters: [{ fieldName: 'Count', operator: EQUAL, search: 5, isSelect: true }],
      db: DatabaseClientType.MSSQL,
      columns: [],
    });

    expect(result).toBe('WHERE [Count] = 5');
  });
});
