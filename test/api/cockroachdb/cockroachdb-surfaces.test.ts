import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, expect, it } from 'vitest';
import { crdbBody, crdbStringBody } from '../support/cockroachdb-connection';

/**
 * Requires the CockroachDB fixture:
 *   bash scripts/test-services/start-fixtures.sh --profile cockroachdb
 */
describe('CockroachDB API surfaces', async () => {
  await setup();

  describe('connection', () => {
    it('passes the health check with the version gate', async () => {
      const res = await $fetch('/api/managment-connection/health-check', {
        method: 'POST',
        body: {
          type: 'cockroachdb',
          method: 'string',
          stringConnection: crdbStringBody().dbConnectionString,
        },
      });

      expect(res).toMatchObject({ isConnectedSuccess: true });
    });
  });

  describe('raw query', () => {
    it('executes SQL through the pg driver', async () => {
      const res = await $fetch('/api/query/raw-execute', {
        method: 'POST',
        body: {
          ...crdbStringBody(),
          query: 'SELECT count(*) AS total FROM film WHERE rating = :rating',
          params: { rating: 'PG' },
        },
      });

      expect(Number(res.rows[0]?.total ?? res.rows[0]?.[0])).toBeGreaterThan(0);
    });
  });

  describe('quick query', () => {
    it('pages table rows', async () => {
      const res = await $fetch('/api/query/execute', {
        method: 'POST',
        body: {
          ...crdbBody(),
          query:
            'SELECT * from "public"."film" ORDER BY "film_id" ASC LIMIT 10 OFFSET 10',
        },
      });

      expect(res.result).toHaveLength(10);
      expect(Number(res.result[0].film_id)).toBe(11);
    });

    it('lists table structure without hidden columns', async () => {
      const res = await $fetch('/api/tables/structure', {
        method: 'POST',
        body: { ...crdbBody(), schema: 'public', tableName: 'payment_log' },
      });
      const columns = (res as Array<{ column_name: string }>).map(
        column => column.column_name
      );

      expect(columns).toEqual(['customer_email', 'amount', 'paid_at', 'note']);
    });

    it('returns SHOW CREATE TABLE output as DDL', async () => {
      const res = await $fetch('/api/tables/ddl', {
        method: 'POST',
        body: { ...crdbBody(), schemaName: 'public', tableName: 'film' },
      });

      expect(String(res)).toContain('CREATE TABLE public.film');
    });

    it('applies bulk updates built with the Postgres dialect', async () => {
      const res = await $fetch('/api/tables/bulk-update', {
        method: 'POST',
        body: {
          ...crdbBody(),
          schemaName: 'public',
          tableName: 'language',
          pKeys: ['language_id'],
          updates: [
            { pKeyValue: { language_id: 6 }, update: { name: 'German' } },
          ],
        },
      });

      expect(res).toMatchObject({ success: true });
    });
  });

  describe('schemas and ERD', () => {
    it('hides crdb_internal from the schema tree', async () => {
      const res = await $fetch('/api/metadata/meta-data', {
        method: 'POST',
        body: crdbStringBody(),
      });
      const names = (res as Array<{ name: string }>).map(schema => schema.name);

      expect(names).toContain('public');
      expect(names).not.toContain('crdb_internal');
    });

    it('returns tables and foreign keys for the ERD', async () => {
      const res = await $fetch('/api/metadata/erd', {
        method: 'POST',
        body: crdbStringBody(),
      });
      const film = res.tables.find(
        (table: { id: string }) => table.id === 'public.film'
      );

      expect(film).toBeDefined();
      expect(film.foreign_keys.length).toBeGreaterThan(0);
      expect(
        res.tables.some((table: { schema: string }) =>
          ['crdb_internal', 'pg_extension'].includes(table.schema)
        )
      ).toBe(false);
    });
  });

  describe('instance insights', () => {
    it('returns a read-only view', async () => {
      const res = await $fetch('/api/instance-insights/view', {
        method: 'POST',
        body: crdbBody(),
      });

      expect(res.dbType).toBe('cockroachdb');
      expect(res.capabilities.supportsCancelQuery).toBe(false);
      expect(res.sections.map((section: { id: string }) => section.id)).toEqual(
        ['overview', 'sessions-locks', 'configuration']
      );
    }, 120_000);
  });
});
