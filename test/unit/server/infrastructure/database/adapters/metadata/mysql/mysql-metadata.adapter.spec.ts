import { describe, expect, it, vi } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { MysqlMetadataAdapter } from '~/server/infrastructure/database/adapters/metadata/mysql/mysql-metadata.adapter';

const buildAdapter = (
  rawQuery: ReturnType<typeof vi.fn>,
  dbType = DatabaseClientType.MYSQL
) => new (MysqlMetadataAdapter as any)({ rawQuery }, dbType);

describe('MysqlMetadataAdapter schema listing', () => {
  it.each([DatabaseClientType.MYSQL, DatabaseClientType.MARIADB])(
    'lists system schemas (flagged is_system, last) when namesOnly is set for %s',
    async dbType => {
      const rawQuery = vi
        .fn()
        .mockResolvedValueOnce([
          { schema_name: 'app' },
          { schema_name: 'information_schema' },
          { schema_name: 'mysql' },
          { schema_name: 'zeta' },
        ]);

      const result = await buildAdapter(rawQuery, dbType).getSchemaMetaData({
        namesOnly: true,
      });

      expect(result.map((s: any) => [s.name, s.is_system])).toEqual([
        ['app', false],
        ['zeta', false],
        ['information_schema', true],
        ['mysql', true],
      ]);
      // Names-only must not exclude system schemas in SQL.
      const [sql, bindings] = rawQuery.mock.calls[0]!;
      expect(sql).not.toContain('NOT IN');
      expect(bindings).toEqual([]);
      expect(rawQuery).toHaveBeenCalledTimes(1);
    }
  );

  it('keeps excluding system schemas on the eager full-metadata path', async () => {
    const rawQuery = vi.fn().mockResolvedValue([]);

    await buildAdapter(rawQuery).getSchemaMetaData();

    const [sql, bindings] = rawQuery.mock.calls[0]!;
    expect(sql).toContain('NOT IN');
    expect(bindings).toEqual([
      'information_schema',
      'mysql',
      'performance_schema',
      'sys',
    ]);
  });

  it('loads a requested system schema on demand without exclusion', async () => {
    const rawQuery = vi.fn().mockResolvedValue([]);

    await buildAdapter(rawQuery).getSchemaMetaData({
      schemaName: 'performance_schema',
    });

    const [sql, bindings] = rawQuery.mock.calls[0]!;
    expect(sql).not.toContain('NOT IN');
    expect(bindings).toEqual(['performance_schema']);
  });
});
