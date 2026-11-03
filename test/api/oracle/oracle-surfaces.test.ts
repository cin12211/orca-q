import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, expect, it } from 'vitest';
import { oracleBody, oracleStringBody } from '../support/oracle-connection';
import { describeSqlObjectRoutes } from '../support/sql-object-routes';

/**
 * Requires the Oracle fixture:
 *   bash scripts/test-services/start-fixtures.sh --profile oracle
 */
describe('Oracle API surfaces', async () => {
  await setup();

  const SCHEMA = 'ORCAQ';

  describe('connection', () => {
    it('passes the health check with the version gate', async () => {
      const res = await $fetch('/api/managment-connection/health-check', {
        method: 'POST',
        body: {
          type: 'oracledb',
          method: 'string',
          stringConnection: oracleStringBody().dbConnectionString,
        },
      });

      expect(res).toMatchObject({ isConnectedSuccess: true });
    });
  });

  describe('raw query', () => {
    it('binds named variables', async () => {
      const res = await $fetch('/api/query/raw-execute', {
        method: 'POST',
        body: {
          ...oracleBody(),
          query: 'SELECT COUNT(*) AS total FROM film WHERE rating = :rating',
          params: { rating: 'PG' },
        },
      });

      expect(Number(res.rows[0].TOTAL)).toBeGreaterThan(0);
    });
  });

  describe('quick query', () => {
    it('pages with OFFSET/FETCH', async () => {
      const res = await $fetch('/api/query/execute', {
        method: 'POST',
        body: {
          ...oracleBody(),
          query: `SELECT * from "${SCHEMA}"."FILM" ORDER BY "FILM_ID" ASC OFFSET 10 ROWS FETCH NEXT 10 ROWS ONLY`,
        },
      });

      expect(res.result).toHaveLength(10);
      expect(res.result[0].FILM_ID).toBe(11);
    });

    it('describes table structure', async () => {
      const res = await $fetch('/api/tables/structure', {
        method: 'POST',
        body: { ...oracleBody(), schema: SCHEMA, tableName: 'FILM' },
      });

      expect(
        (res as Array<{ column_name: string }>).map(
          column => column.column_name
        )
      ).toContain('TITLE');
    });

    it('returns table DDL', async () => {
      const res = await $fetch('/api/tables/ddl', {
        method: 'POST',
        body: { ...oracleBody(), schemaName: SCHEMA, tableName: 'FILM' },
      });

      expect(String(res)).toContain('CREATE TABLE');
    });

    it('updates a row, including a date value from the grid', async () => {
      const res = await $fetch('/api/tables/bulk-update', {
        method: 'POST',
        body: {
          ...oracleBody(),
          schemaName: SCHEMA,
          tableName: 'LANGUAGE',
          pKeys: ['LANGUAGE_ID'],
          updates: [
            {
              pKeyValue: { LANGUAGE_ID: 6 },
              update: { LAST_UPDATE: '2006-02-15T05:03:42.000Z' },
            },
          ],
        },
      });

      expect(res).toMatchObject({ success: true });
    });
  });

  describe('schemas and ERD', () => {
    it('lists the app schema', async () => {
      const res = await $fetch('/api/metadata/meta-data', {
        method: 'POST',
        body: { ...oracleBody(), namesOnly: true },
      });

      const schemas = res as Array<{ name: string; is_system: boolean }>;

      // The connected user's schema comes first so it becomes the default.
      expect(schemas[0]).toMatchObject({ name: SCHEMA, is_system: false });
      expect(schemas.find(schema => schema.name === 'SYS')?.is_system).toBe(
        true
      );
    });

    it('returns tables and foreign keys for the ERD', async () => {
      const res = await $fetch('/api/metadata/erd', {
        method: 'POST',
        body: oracleBody(),
      });
      const film = res.tables.find(
        (table: { table: string }) => table.table === 'FILM'
      );

      expect(film).toBeDefined();
      expect(film.foreign_keys.length).toBeGreaterThan(0);
    });
  });

  describeSqlObjectRoutes({
    body: oracleBody,
    schema: 'ORCAQ',
    table: 'FILM',
    view: 'FILM_LIST',
    viewColumn: 'TITLE',
    csvHeader: 'FILM_ID',
  });

  describe('schema diff', () => {
    it('finds no changes against the same database', async () => {
      const source = {
        ...oracleBody(),
        connectionString: '',
      };
      const res = await $fetch('/api/schema-diff', {
        method: 'POST',
        body: { source, target: source },
      });

      expect(res.summary).toMatchObject({ added: 0, removed: 0, modified: 0 });
    });
  });

  describe('instance insights', () => {
    it('returns a read-only view without action tags', async () => {
      const res = await $fetch('/api/instance-insights/view', {
        method: 'POST',
        body: oracleBody(),
      });

      expect(res.dbType).toBe('oracledb');
      expect(res.actions).toEqual([]);
    }, 120_000);
  });
});
