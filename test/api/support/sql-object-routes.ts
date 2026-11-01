import { $fetch } from '@nuxt/test-utils/e2e';
import { describe, expect, it } from 'vitest';

interface SqlObjectRoutesOptions {
  body: () => Record<string, unknown>;
  schema: string;
  table: string;
  view: string;
  viewColumn: string;
  csvHeader: string;
}

/** Table and view detail routes that every SQL engine must serve. */
export function describeSqlObjectRoutes({
  body,
  schema,
  table,
  view,
  viewColumn,
  csvHeader,
}: SqlObjectRoutesOptions) {
  const post = (path: string, extra: Record<string, unknown>) =>
    $fetch(path, { method: 'POST', body: { ...body(), schema, ...extra } });

  describe('table details', () => {
    it('lists tables in the overview', async () => {
      const res = await post('/api/tables/overview', {});

      expect((res as Array<{ name: string }>).map(row => row.name)).toContain(
        table
      );
    });

    it('returns table meta and size', async () => {
      const meta = await post('/api/tables/meta', { tableName: table });
      const size = await post('/api/tables/size', { tableName: table });

      expect(String(meta.type).toLowerCase()).toBe('table');
      expect(size.tableSize).toBeTruthy();
    });

    it('lists indexes and triggers', async () => {
      const indexes = await post('/api/tables/indexes', { table });
      const triggers = await post('/api/tables/triggers', { table });

      expect(indexes.length).toBeGreaterThan(0);
      expect(Array.isArray(triggers)).toBe(true);
    });

    it('exports CSV with a header row', async () => {
      const res = await $fetch('/api/tables/export', {
        method: 'POST',
        body: {
          ...body(),
          schemaName: schema,
          tableName: table,
          format: 'csv',
        },
        responseType: 'text',
      });

      expect(String(res).split(/\r?\n/)[0]).toContain(csvHeader);
    });
  });

  describe('view details', () => {
    it('lists views and opens one from its schema tree id', async () => {
      const overview = await post('/api/views/overview', {});
      const [metadata] = await $fetch('/api/metadata/meta-data', {
        method: 'POST',
        body: { ...body(), schemaName: schema },
      });
      const viewEntry = metadata.views.find(
        (entry: { name: string }) => entry.name === view
      );
      const definition = await post('/api/views/definition', {
        viewId: viewEntry.oid,
      });

      expect(
        (overview as Array<{ name: string }>).map(row => row.name)
      ).toContain(view);
      expect(definition.definition).toMatch(/select/i);
    });

    it('returns view meta and dependencies', async () => {
      const meta = await post('/api/views/meta', { viewName: view });
      const dependencies = await post('/api/views/dependencies', {
        viewName: view,
      });

      expect(meta.type).toBe('normal');
      expect(dependencies.length).toBeGreaterThan(0);
    });

    it('describes view columns through the schema tree', async () => {
      const [metadata] = await $fetch('/api/metadata/meta-data', {
        method: 'POST',
        body: { ...body(), schemaName: schema },
      });

      expect(
        metadata.view_details[view].columns.map(
          (column: { name: string }) => column.name
        )
      ).toContain(viewColumn);
    });
  });
}
