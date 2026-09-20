import { describe, expect, it, vi } from 'vitest';
import { PostgresMetadataAdapter } from '~/server/infrastructure/database/adapters/metadata/postgres/postgres-metadata.adapter';

describe('PostgresMetadataAdapter schema listing', () => {
  it('returns system schemas flagged as is_system when namesOnly is set', async () => {
    const rawQuery = vi.fn().mockResolvedValueOnce([
      { name: 'adt', is_system: false },
      { name: 'public', is_system: false },
      { name: 'information_schema', is_system: true },
      { name: 'pg_catalog', is_system: true },
    ]);

    const adapter = new (PostgresMetadataAdapter as any)({ rawQuery });
    const result = await adapter.getSchemaMetaData({ namesOnly: true });

    expect(result.map((s: any) => [s.name, s.is_system])).toEqual([
      ['adt', false],
      ['public', false],
      ['information_schema', true],
      ['pg_catalog', true],
    ]);
    expect(result[0]).toMatchObject({ tables: null, table_details: null });
    expect(rawQuery).toHaveBeenCalledTimes(1);
  });

  it('binds the requested schema name so a system schema can be loaded on demand', async () => {
    const rawQuery = vi.fn().mockResolvedValueOnce([]);

    const adapter = new (PostgresMetadataAdapter as any)({ rawQuery });
    await adapter.getSchemaMetaData({ schemaName: 'pg_catalog' });

    const [sql, bindings] = rawQuery.mock.calls[0]!;
    expect(bindings).toEqual(['pg_catalog']);
    expect(sql).not.toContain("NOT LIKE 'pg_%'");
  });
});
