import { describe, expect, it } from 'vitest';
import {
  buildSchemaMetaDataQuery,
  getErdDataQuery,
  getReverseSchemasQuery,
  getSchemaNamesQuery,
} from '~/server/infrastructure/database/adapters/metadata/cockroachdb/constants';

describe('CockroachDB metadata queries', () => {
  it('treats crdb_internal and pg_extension as system schemas', () => {
    expect(getSchemaNamesQuery).toContain("'crdb_internal', 'pg_extension'");
    expect(getReverseSchemasQuery).toContain("'crdb_internal', 'pg_extension'");
    expect(getErdDataQuery).toContain("'crdb_internal', 'pg_extension'");
  });

  it('avoids functions CockroachDB does not implement', () => {
    expect(getErdDataQuery).not.toContain('pg_relation_size');
    expect(getErdDataQuery).toContain("cols.is_hidden = 'NO'");
    expect(getErdDataQuery).toContain("'pg_catalog.pg_class'::REGCLASS");
  });

  it('builds schema metadata without correlated json_object_agg', () => {
    const all = buildSchemaMetaDataQuery();
    const single = buildSchemaMetaDataQuery('public');

    expect(all).not.toContain('json_object_agg');
    expect(all).toContain("NOT IN ('information_schema', 'crdb_internal')");
    expect(single).toContain('nsp.nspname = ?');
    expect(single).toContain("ic.is_hidden = 'NO'");
  });
});
