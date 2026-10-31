import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, expect, it } from 'vitest';
import { mssqlBody, mssqlStringBody } from '../support/mssql-connection';

/**
 * Requires the SQL Server fixture:
 *   bash scripts/test-services/start-fixtures.sh --profile mssql
 */
describe('SQL Server API surfaces', async () => {
  await setup();

  describe('connection', () => {
    it('passes the health check with an ADO.NET string', async () => {
      const res = await $fetch('/api/managment-connection/health-check', {
        method: 'POST',
        body: {
          type: 'mssql',
          method: 'string',
          stringConnection: mssqlStringBody().dbConnectionString,
        },
      });

      expect(res).toMatchObject({ isConnectedSuccess: true });
    });
  });

  describe('raw query', () => {
    it('runs GO-separated batches and returns the last result set', async () => {
      const res = await $fetch('/api/query/raw-execute', {
        method: 'POST',
        body: {
          ...mssqlStringBody(),
          query: [
            'DECLARE @n INT = 1',
            'SELECT @n AS first_batch',
            'GO',
            'SELECT COUNT(*) AS total FROM film WHERE rating = :rating',
          ].join('\n'),
          params: { rating: 'PG' },
        },
      });

      expect(res.fields.map((field: { name: string }) => field.name)).toEqual([
        'total',
      ]);
      expect(res.rows[0].total).toBeGreaterThan(0);
    });

    it('keeps literal question marks intact', async () => {
      const res = await $fetch('/api/query/execute', {
        method: 'POST',
        body: { ...mssqlBody(), query: "SELECT N'why?' AS q" },
      });

      expect(res.result[0]).toEqual({ q: 'why?' });
    });
  });

  describe('quick query', () => {
    it('pages with OFFSET/FETCH', async () => {
      const res = await $fetch('/api/query/execute', {
        method: 'POST',
        body: {
          ...mssqlBody(),
          query:
            'SELECT * from [dbo].[film] ORDER BY [film_id] ASC OFFSET 10 ROWS FETCH NEXT 10 ROWS ONLY',
        },
      });

      expect(res.result).toHaveLength(10);
      expect(res.result[0].film_id).toBe(11);
    });

    it('describes table structure', async () => {
      const res = await $fetch('/api/tables/structure', {
        method: 'POST',
        body: { ...mssqlBody(), schema: 'dbo', tableName: 'film' },
      });
      const filmId = (res as Array<Record<string, unknown>>).find(
        column => column.column_name === 'film_id'
      );

      expect(filmId).toMatchObject({
        data_type: 'int',
        is_nullable: 'NO',
        default_value: 'IDENTITY(1,1)',
      });
    });

    it('builds DDL from the catalog', async () => {
      const res = await $fetch('/api/tables/ddl', {
        method: 'POST',
        body: { ...mssqlBody(), schemaName: 'dbo', tableName: 'film' },
      });

      expect(String(res)).toContain('CREATE TABLE [dbo].[film]');
      expect(String(res)).toContain('IDENTITY(1,1)');
    });

    it('updates rows inside a transaction', async () => {
      const res = await $fetch('/api/tables/bulk-update', {
        method: 'POST',
        body: {
          ...mssqlBody(),
          schemaName: 'dbo',
          tableName: 'language',
          pKeys: ['language_id'],
          updates: [
            { pKeyValue: { language_id: 6 }, update: { name: 'German' } },
          ],
        },
      });

      expect(res).toMatchObject({ success: true });
      expect(res.data[0].affectedRows).toBe(1);
    });

    it('leaves identity columns out of inserts', async () => {
      const res = await $fetch('/api/tables/bulk-insert', {
        method: 'POST',
        body: {
          ...mssqlBody(),
          schemaName: 'dbo',
          tableName: 'language',
          insertItems: [{ language_id: null, name: 'Klingon' }],
        },
      });

      expect(res).toMatchObject({ success: true });

      await $fetch('/api/query/execute', {
        method: 'POST',
        body: {
          ...mssqlBody(),
          query: "DELETE FROM [dbo].[language] WHERE [name] = N'Klingon'",
        },
      });
    });
  });

  describe('export', () => {
    it('exports CSV with a header row', async () => {
      const res = await $fetch('/api/tables/export', {
        method: 'POST',
        body: {
          ...mssqlBody(),
          schemaName: 'dbo',
          tableName: 'language',
          format: 'csv',
        },
        responseType: 'text',
      });

      expect(String(res).split(/\r?\n/)[0]).toBe(
        'language_id,name,last_update'
      );
    });

    it('exports INSERT statements SQL Server can parse', async () => {
      const res = String(
        await $fetch('/api/tables/export', {
          method: 'POST',
          body: {
            ...mssqlBody(),
            schemaName: 'dbo',
            tableName: 'language',
            format: 'sql',
          },
          responseType: 'text',
        })
      );
      const insert = res
        .split('\n')
        .find(line => line.startsWith('INSERT INTO [dbo].[language]'));

      expect(insert).toMatch(/VALUES \(1, N'English\s*', '\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('schemas and ERD', () => {
    it('lists schemas without role schemas', async () => {
      const res = await $fetch('/api/metadata/meta-data', {
        method: 'POST',
        body: { ...mssqlBody(), namesOnly: true },
      });
      const names = (res as Array<{ name: string }>).map(schema => schema.name);

      expect(names).toContain('dbo');
      expect(names).not.toContain('db_owner');
    });

    it('returns tables, keys and indexes for the ERD', async () => {
      const res = await $fetch('/api/metadata/erd', {
        method: 'POST',
        body: mssqlBody(),
      });
      const film = res.tables.find(
        (table: { id: string }) => table.id === 'dbo.film'
      );

      expect(film.primary_keys).toEqual([
        { column: 'film_id', pk_def: 'PRIMARY KEY (film_id)' },
      ]);
      expect(film.foreign_keys.length).toBe(2);
      expect(film.indexes.length).toBeGreaterThan(0);
    });
  });

  describe('instance insights', () => {
    it('returns a read-only view', async () => {
      const res = await $fetch('/api/instance-insights/view', {
        method: 'POST',
        body: mssqlBody(),
      });

      expect(res.dbType).toBe('mssql');
      expect(res.capabilities.supportsTerminateConnection).toBe(false);
      expect(res.sections[0].status).toBe('ready');
    }, 120_000);
  });
});
