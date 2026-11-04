import { describe, expect, it } from 'vitest';
import {
  buildSchemaMetaDataQuery,
  getSchemaMetaDataQuery,
  getSchemaNamesQuery,
} from '~/server/infrastructure/database/adapters/metadata/postgres/constants/schema-metadata.query';

describe('getSchemaMetaDataQuery', () => {
  it('joins routines to pg_proc using specific_name and oid', () => {
    expect(getSchemaMetaDataQuery).toContain(
      "ON r.specific_name = r.routine_name || '_' || p.oid::text"
    );
  });

  it('does not join pg_proc by proname only', () => {
    expect(getSchemaMetaDataQuery).not.toContain(
      'JOIN pg_proc p ON p.proname = r.routine_name'
    );
  });

  it('does not keep the extra pg_namespace join in the functions subquery', () => {
    expect(getSchemaMetaDataQuery).not.toContain(
      'JOIN pg_namespace n ON n.oid = p.pronamespace'
    );
    expect(getSchemaMetaDataQuery).not.toContain(
      'AND n.nspname = r.specific_schema'
    );
  });

  it('still returns the function schema and parameters in the JSON payload', () => {
    expect(getSchemaMetaDataQuery).toContain("'parameters'");
    expect(getSchemaMetaDataQuery).toContain(
      'PG_GET_FUNCTION_ARGUMENTS(p.oid)'
    );
    expect(getSchemaMetaDataQuery).toContain("'schema'");
    expect(getSchemaMetaDataQuery).toContain('r.specific_schema');
  });

  it('still filters out system schemas for routines', () => {
    expect(getSchemaMetaDataQuery).toContain(
      "r.specific_schema NOT IN ('pg_catalog', 'information_schema')"
    );
    expect(getSchemaMetaDataQuery).toContain(
      'WHERE r.routine_schema = nsp.nspname'
    );
  });

  it('returns raw_type_name instead of keeping alias CASE logic in SQL', () => {
    expect(getSchemaMetaDataQuery).toContain("'raw_type_name'");
    expect(getSchemaMetaDataQuery).not.toContain(
      'END -- short type with length, user-friendly'
    );
  });
});

describe('getSchemaNamesQuery', () => {
  it('only selects the schema name column, not tables/views/functions', () => {
    expect(getSchemaNamesQuery).toContain('nsp.nspname AS name');
    expect(getSchemaNamesQuery).not.toContain('AS tables');
    expect(getSchemaNamesQuery).not.toContain('AS table_details');
  });

  it('keeps pg_catalog and information_schema selectable and flags them as system', () => {
    expect(getSchemaNamesQuery).not.toContain("NOT LIKE 'pg_%'");
    expect(getSchemaNamesQuery).not.toContain(
      "nsp.nspname <> 'information_schema'"
    );
    expect(getSchemaNamesQuery).toContain(
      "nsp.nspname IN ('pg_catalog', 'information_schema') AS is_system"
    );
  });

  it('still hides internal pg_toast / pg_temp schemas and lists user schemas first', () => {
    expect(getSchemaNamesQuery).toContain("NOT LIKE 'pg\\_toast%'");
    expect(getSchemaNamesQuery).toContain("NOT LIKE 'pg\\_temp\\_%'");
    expect(getSchemaNamesQuery).toContain('ORDER BY is_system, nsp.nspname');
  });
});

describe('buildSchemaMetaDataQuery', () => {
  it('returns the unfiltered query when no schemaName is given', () => {
    const query = buildSchemaMetaDataQuery();
    expect(query).not.toContain('AND nsp.nspname = ?');
    expect(query.trim().endsWith(';')).toBe(true);
  });

  it('appends a single schema filter binding when schemaName is given', () => {
    const query = buildSchemaMetaDataQuery('public');
    expect(query).toContain('AND nsp.nspname = ?;');
  });

  it('keeps excluding system schemas on the eager (no schemaName) path', () => {
    const query = buildSchemaMetaDataQuery();
    expect(query).toContain("AND nsp.nspname <> 'information_schema'");
    expect(query).toContain("AND nsp.nspname NOT LIKE 'pg_%'");
  });

  it('does not exclude system schemas when a schemaName is requested, so pg_catalog can be loaded on demand', () => {
    const query = buildSchemaMetaDataQuery('pg_catalog');
    expect(query).not.toContain("NOT LIKE 'pg_%'");
    expect(query).not.toContain("nsp.nspname <> 'information_schema'");
    expect(query).toContain('AND nsp.nspname = ?;');
  });
});
