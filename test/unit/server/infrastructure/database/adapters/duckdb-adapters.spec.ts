import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { DuckDbRoleAdapter } from '~/server/infrastructure/database/adapters/database-roles/duckdb/duckdb-role.adapter';
import { DuckDbFunctionAdapter } from '~/server/infrastructure/database/adapters/functions/duckdb/duckdb-function.adapter';
import { DuckDbInstanceInsightsAdapter } from '~/server/infrastructure/database/adapters/instance-insights/duckdb/duckdb-instance-insights.adapter';
import { DuckDbMetadataAdapter } from '~/server/infrastructure/database/adapters/metadata/duckdb/duckdb-metadata.adapter';
import { DuckDbQueryAdapter } from '~/server/infrastructure/database/adapters/query/duckdb/duckdb-query.adapter';
import { DuckDbTableAdapter } from '~/server/infrastructure/database/adapters/tables/duckdb/duckdb-table.adapter';
import { DuckDbViewAdapter } from '~/server/infrastructure/database/adapters/views/duckdb/duckdb-view.adapter';
import { DuckDbAdapter } from '~/server/infrastructure/driver/duckdb.adapter';

const SEED_SQL = `
  CREATE SCHEMA sales;
  CREATE TABLE sales.customer (
    id INTEGER PRIMARY KEY,
    name VARCHAR NOT NULL DEFAULT 'guest',
    total DECIMAL(10, 2)
  );
  CREATE TABLE sales.orders (
    id BIGINT PRIMARY KEY,
    customer_id INTEGER REFERENCES sales.customer (id),
    amount DOUBLE
  );
  CREATE UNIQUE INDEX idx_customer_name ON sales.customer (name);
  CREATE VIEW sales.big_orders AS SELECT id, amount FROM sales.orders WHERE amount > 10;
  CREATE TABLE plain (id INTEGER);
  INSERT INTO sales.customer VALUES (1, 'ann', 12.50), (2, 'bob', 3.00);
  INSERT INTO sales.orders VALUES (1, 1, 20), (2, 1, 5), (3, 2, 30);
`;

// The adapters are exercised against a real in-memory DuckDB: their whole job is
// the catalog SQL, which a mocked driver could not validate.
function createAdapter<T>(Adapter: { prototype: T }, driver: DuckDbAdapter): T {
  return new (Adapter as unknown as new (driver: DuckDbAdapter) => T)(driver);
}

describe('DuckDB domain adapters', () => {
  let driver: DuckDbAdapter;

  beforeAll(async () => {
    driver = new DuckDbAdapter(':memory:');
    await driver.rawQuery(SEED_SQL);
  });

  afterAll(async () => {
    await driver.destroy();
  });

  describe('DuckDbMetadataAdapter', () => {
    const metadata = () => createAdapter(DuckDbMetadataAdapter, driver);

    it('lists user schemas only', async () => {
      const schemas = await metadata().getSchemaMetaData({ namesOnly: true });

      expect(schemas.map(schema => schema.name)).toEqual(['main', 'sales']);
      expect(schemas[0]?.tables).toBeNull();
    });

    it('describes tables, keys and views of a schema', async () => {
      const [sales] = await metadata().getSchemaMetaData({
        schemaName: 'sales',
      });

      expect(sales?.tables).toEqual(['customer', 'orders']);
      expect(sales?.views?.map(view => view.name)).toEqual(['big_orders']);

      const customer = sales?.table_details?.customer;
      expect(customer?.table_id).toBe('sales.customer');
      expect(customer?.primary_keys).toEqual([{ column: 'id' }]);
      expect(customer?.columns[1]).toMatchObject({
        name: 'name',
        ordinal_position: 2,
        type: 'VARCHAR',
        is_nullable: false,
        default_value: "'guest'",
      });
      expect(customer?.columns[0]?.short_type_name).toBe('int4');

      expect(sales?.table_details?.orders?.foreign_keys).toEqual([
        {
          column: 'customer_id',
          referenced_column: 'id',
          referenced_table: 'customer',
          referenced_table_schema: 'sales',
        },
      ]);

      expect(
        sales?.view_details?.big_orders?.columns.map(column => column.name)
      ).toEqual(['id', 'amount']);
    });

    it('builds ERD data', async () => {
      const erd = await metadata().getErdData();

      expect(erd.version).toMatch(/^v\d+/);
      expect(erd.databaseName).toBe('memory');
      expect(erd.tables.map(table => table.id)).toEqual([
        'main.plain',
        'sales.customer',
        'sales.orders',
      ]);
      expect(erd.views.map(view => view.view_name)).toEqual(['big_orders']);
    });

    it('builds the reverse foreign key map', async () => {
      const reverse = await metadata().getReverseSchemas();
      const customer = reverse.find(table => table.table === 'customer');

      expect(customer?.used_by).toEqual([
        {
          referencing_schema: 'sales',
          referencing_table: 'orders',
          foreign_key_name: 'orders.customer_id',
          fk_column: 'customer_id',
          referenced_column: 'id',
        },
      ]);
    });
  });

  describe('DuckDbTableAdapter', () => {
    const tables = () => createAdapter(DuckDbTableAdapter, driver);

    it('lists table overview rows', async () => {
      await expect(tables().getOverviewTables('sales')).resolves.toMatchObject([
        { name: 'customer', schema: 'sales', kind: 'TABLE', estimated_row: 2 },
        { name: 'orders', schema: 'sales', kind: 'TABLE', estimated_row: 3 },
      ]);
    });

    it('maps the public schema alias to main', async () => {
      await expect(tables().getOverviewTables('public')).resolves.toMatchObject(
        [{ name: 'plain', schema: 'main' }]
      );
    });

    it('describes the table structure', async () => {
      const structure = await tables().getTableStructure('sales', 'orders');

      expect(structure.map(column => column.column_name)).toEqual([
        'id',
        'customer_id',
        'amount',
      ]);
      expect(structure[1]).toMatchObject({
        data_type: 'INTEGER',
        is_nullable: 'YES',
        foreign_keys: ' -> customer(id)',
      });
    });

    it('counts rows for table meta', async () => {
      await expect(
        tables().getTableMeta('sales', 'orders')
      ).resolves.toMatchObject({ type: 'TABLE', rowEstimate: 3 });
    });

    it('returns the table DDL and 404s on unknown tables', async () => {
      await expect(tables().getTableDdl('sales', 'orders')).resolves.toContain(
        'CREATE TABLE sales.orders'
      );
      await expect(tables().getTableDdl('sales', 'nope')).rejects.toMatchObject(
        { statusCode: 404 }
      );
    });

    it('lists primary key and secondary indexes', async () => {
      const indexes = await tables().getTableIndexes('sales', 'customer');

      expect(indexes.map(index => [index.isPrimary, index.isUnique])).toEqual([
        [true, true],
        [false, true],
      ]);
      expect(indexes[0]?.definition).toBe('id');
      expect(indexes[1]?.indexName).toBe('idx_customer_name');
    });

    it('commits bulk statements with their affected rows', async () => {
      await driver.rawQuery('CREATE TABLE bulk_ok (id INTEGER)');
      await driver.rawQuery('INSERT INTO bulk_ok VALUES (1), (2)');

      const result = await tables().executeBulkUpdate([
        'UPDATE bulk_ok SET id = 3 WHERE id = 1',
        'DELETE FROM bulk_ok WHERE id = 2',
      ]);

      expect(result.success).toBe(true);
      expect(result.data?.map(item => item.affectedRows)).toEqual([1, 1]);
      await expect(driver.rawQuery('SELECT id FROM bulk_ok')).resolves.toEqual([
        { id: 3 },
      ]);
    });

    it('rolls bulk statements back on failure and frees the session', async () => {
      await driver.rawQuery('CREATE TABLE bulk_fail (id INTEGER)');

      const result = await tables().executeBulkDelete([
        'INSERT INTO bulk_fail VALUES (1)',
        'DELETE FROM missing_table',
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('missing_table');
      await expect(driver.rawQuery('SELECT * FROM bulk_fail')).resolves.toEqual(
        []
      );
    });
  });

  describe('DuckDbViewAdapter', () => {
    const views = () => createAdapter(DuckDbViewAdapter, driver);

    it('lists views and their columns', async () => {
      await expect(views().getOverviewViews('sales')).resolves.toMatchObject([
        { name: 'big_orders', schema: 'sales', type: 'VIEW' },
      ]);
      await expect(
        views().getViewColumns('sales', 'big_orders')
      ).resolves.toEqual([
        {
          columnName: 'id',
          dataType: 'BIGINT',
          isNullable: 'YES',
          defaultValue: null,
        },
        {
          columnName: 'amount',
          dataType: 'DOUBLE',
          isNullable: 'YES',
          defaultValue: null,
        },
      ]);
    });

    it('loads a view definition from its metadata oid', async () => {
      const [sales] = await createAdapter(
        DuckDbMetadataAdapter,
        driver
      ).getSchemaMetaData({ schemaName: 'sales' });
      const oid = sales?.views?.[0]?.oid as string;

      await expect(views().getViewDefinition(oid)).resolves.toMatchObject({
        viewName: 'big_orders',
        schemaName: 'sales',
        definition: expect.stringContaining('CREATE VIEW sales.big_orders'),
      });
    });

    it('reports row count and explains the view', async () => {
      await expect(
        views().getViewMeta('sales', 'big_orders')
      ).resolves.toMatchObject({ type: 'normal', rowEstimate: 2 });
      await expect(
        views().getViewExplainPlan('sales', 'big_orders')
      ).resolves.not.toBe('');
    });
  });

  describe('DuckDbQueryAdapter', () => {
    const query = () => createAdapter(DuckDbQueryAdapter, driver);

    const runStream = async (sql: string) => {
      const chunks: string[] = [];
      const event = {
        node: {
          res: {
            setHeader: vi.fn(),
            write: (chunk: string) => chunks.push(chunk),
            end: vi.fn(),
            once: vi.fn(),
            off: vi.fn(),
          },
        },
      };

      await query().rawExecuteStream(event as never, sql);

      return chunks.map(chunk => JSON.parse(chunk));
    };

    it('returns readable values from execute', async () => {
      const { result } = await query().execute(
        `SELECT {'k': 1} AS item, ['x'] AS list`
      );

      expect(result).toEqual([{ item: '{"k":1}', list: ['x'] }]);
    });

    it('serializes MAP and LIST of STRUCT values as JSON', async () => {
      const { rows } = await query().rawExecute(
        `SELECT MAP {'a': 1} AS lookup, [{'k': 1}] AS entries`
      );

      expect(rows).toEqual([
        { lookup: '[{"key":"a","value":1}]', entries: '[{"k":1}]' },
      ]);
    });

    it('returns row objects with fields', async () => {
      const result = await query().rawExecute(
        'SELECT id, amount FROM sales.orders ORDER BY id LIMIT 1'
      );

      expect(result.rows).toEqual([{ id: '1', amount: 20 }]);
      expect(result.fields.map(field => field.name)).toEqual(['id', 'amount']);
    });

    it('leaves colons and question marks alone without params', async () => {
      const result = await query().rawExecute(
        `SELECT [1, 2, 3][1:2] AS sliced, {'k': 1} AS item, '?' AS mark`
      );

      expect(result.rows).toEqual([
        { sliced: [1, 2], item: '{"k":1}', mark: '?' },
      ]);
    });

    it('binds named and list params', async () => {
      const result = await query().rawExecute(
        'SELECT id FROM sales.orders WHERE amount > :min AND id IN (:ids) ORDER BY id',
        { min: 1, ids: [1, 3] }
      );

      expect(result.rows).toEqual([{ id: '1' }, { id: '3' }]);
    });

    it('keeps literals and syntax intact when variables are bound', async () => {
      const result = await query().rawExecute(
        `SELECT :v AS bound, '?:v' AS text, [1, 2, 3][1:2] AS sliced, 1::VARCHAR AS casted`,
        { v: 7, unused: 1 }
      );

      expect(result.rows).toEqual([
        { bound: 7, text: '?:v', sliced: [1, 2], casted: '1' },
      ]);
    });

    it('binds positional params', async () => {
      const result = await query().rawExecute(
        'SELECT id FROM sales.orders WHERE id = ?',
        [2]
      );

      expect(result.rows).toEqual([{ id: '2' }]);
    });

    it('streams metadata, rows and completion as NDJSON', async () => {
      const lines = await runStream(
        'SELECT id FROM sales.customer ORDER BY id'
      );

      expect(lines.map(line => line.type)).toEqual(['meta', 'rows', 'done']);
      expect(lines[0]).toMatchObject({ command: 'SELECT' });
      expect(lines[1].data).toEqual([{ id: 1 }, { id: 2 }]);
      expect(lines[2].rowCount).toBe(2);
    });

    it('streams large results in batches', async () => {
      const lines = await runStream('SELECT * FROM range(25000)');
      const batches = lines.filter(line => line.type === 'rows');

      expect(batches.length).toBeGreaterThan(1);
      expect(
        batches.reduce((total, batch) => total + batch.data.length, 0)
      ).toBe(25000);
      expect(lines.at(-1)).toMatchObject({ type: 'done', rowCount: 25000 });
    });

    it('streams the affected row count of a mutation', async () => {
      await driver.rawQuery('CREATE TABLE stream_write (id INTEGER)');

      const lines = await runStream(
        'INSERT INTO stream_write VALUES (1), (2), (3)'
      );

      expect(lines[0]).toMatchObject({ command: 'INSERT', fields: [] });
      expect(lines.at(-1)).toMatchObject({ type: 'done', rowCount: 3 });
    });

    it('streams driver errors with a readable message', async () => {
      const lines = await runStream('SELECT * FROM nope');

      expect(lines).toHaveLength(1);
      expect(lines[0].type).toBe('error');
      expect(lines[0].message).toContain('nope');
      expect(lines[0].error.normalizeError).toMatchObject({
        dbType: DatabaseClientType.DUCKDB,
        message: lines[0].message,
      });
    });
  });

  describe('DuckDbInstanceInsightsAdapter', () => {
    it('reports version, storage and settings', async () => {
      const insights = createAdapter(DuckDbInstanceInsightsAdapter, driver);

      const view = await insights.getView();

      expect(view.dbType).toBe(DatabaseClientType.DUCKDB);
      expect(view.version).toMatch(/^v\d+/);
      expect(view.sections.map(section => section.status)).toEqual([
        'ready',
        'ready',
      ]);
      expect(view.sections[1]?.tables[0]?.rows.length).toBeGreaterThan(0);
    });
  });

  describe('features DuckDB does not offer', () => {
    it('answers function tooling with a 501', async () => {
      const functions = await DuckDbFunctionAdapter.create({});

      await expect(
        functions.getOverviewFunctions('main')
      ).rejects.toMatchObject({
        statusCode: 501,
        statusMessage: expect.stringContaining('DuckDB'),
      });
    });

    it('answers role tooling with a 501', async () => {
      const roles = await DuckDbRoleAdapter.create({});

      await expect(roles.getRoles()).rejects.toMatchObject({ statusCode: 501 });
    });
  });
});
