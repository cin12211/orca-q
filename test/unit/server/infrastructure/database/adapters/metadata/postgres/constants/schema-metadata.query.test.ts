import { describe, expect, it } from 'vitest';
import { getSchemaMetaDataQuery } from '~/server/infrastructure/database/adapters/metadata/postgres/constants/schema-metadata.query';

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
});
