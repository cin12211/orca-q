import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildDuckDbSamples } from '~/scripts/test-services/prepare-duckdb-sample.mjs';
import { DuckDbMetadataAdapter } from '~/server/infrastructure/database/adapters/metadata/duckdb/duckdb-metadata.adapter';
import { DuckDbAdapter } from '~/server/infrastructure/driver/duckdb.adapter';
import { computeSchemaDiff } from '~/server/utils/schema-diff.utils';

function createMetadataAdapter(driver: DuckDbAdapter) {
  return new (DuckDbMetadataAdapter as unknown as new (
    driver: DuckDbAdapter
  ) => DuckDbMetadataAdapter)(driver);
}

describe('DuckDB sample fixture', () => {
  const directory = mkdtempSync(join(tmpdir(), 'orcaq-duckdb-fixture-'));
  let shop: DuckDbAdapter;
  let staging: DuckDbAdapter;

  beforeAll(async () => {
    const paths = await buildDuckDbSamples(directory);

    shop = new DuckDbAdapter({ filename: paths.shop });
    staging = new DuckDbAdapter({ filename: paths.staging });
  }, 60_000);

  afterAll(async () => {
    await Promise.all([shop.destroy(), staging.destroy()]);
    rmSync(directory, { recursive: true, force: true });
  });

  it('exposes every schema with its tables and views', async () => {
    const schemas = await createMetadataAdapter(shop).getSchemaMetaData();

    expect(schemas.map(schema => schema.name)).toEqual([
      'analytics',
      'inventory',
      'main',
      'sales',
    ]);
    expect(schemas.find(s => s.name === 'sales')?.tables).toEqual([
      'category',
      'customer',
      'order_item',
      'orders',
      'product',
    ]);
    expect(
      schemas.find(s => s.name === 'analytics')?.views?.map(v => v.name)
    ).toEqual(['daily_revenue', 'top_customer']);
  });

  it('keeps foreign keys for the ERD', async () => {
    const [sales] = await createMetadataAdapter(shop).getSchemaMetaData({
      schemaName: 'sales',
    });

    expect(sales?.table_details?.order_item?.foreign_keys).toHaveLength(2);
    expect(sales?.table_details?.order_item?.primary_keys).toEqual([
      { column: 'order_id' },
      { column: 'line_no' },
    ]);
  });

  it('seeds a few thousand rows', async () => {
    const [counts] = await shop.rawQuery<Record<string, string>>(`
      SELECT
        (SELECT COUNT(*) FROM sales.orders) AS orders,
        (SELECT COUNT(*) FROM sales.customer) AS customers,
        (SELECT COUNT(*) FROM analytics.event) AS events
    `);

    expect(counts).toEqual({
      orders: '2000',
      customers: '500',
      events: '5000',
    });
  });

  it('stays deterministic across builds', async () => {
    const rebuilt = await buildDuckDbSamples(join(directory, 'again'));
    const copy = new DuckDbAdapter({ filename: rebuilt.shop });
    const checksum =
      'SELECT SUM(hash(order_id, line_no, product_id, quantity, unit_price))::VARCHAR AS total FROM sales.order_item';

    try {
      await expect(copy.rawQuery(checksum)).resolves.toEqual(
        await shop.rawQuery(checksum)
      );
    } finally {
      await copy.destroy();
    }
  }, 60_000);

  it('runs macros', async () => {
    await expect(
      shop.rawQuery('SELECT sales.net_amount(100, 2, 10) AS net')
    ).resolves.toEqual([{ net: 180 }]);
  });

  it('drifts the staging file for schema diff', async () => {
    const [source, target] = await Promise.all([
      createMetadataAdapter(shop).getSchemaMetaData(),
      createMetadataAdapter(staging).getSchemaMetaData(),
    ]);

    const diff = computeSchemaDiff(source, target, true);

    expect(diff.summary.modified).toBeGreaterThan(0);
    expect(diff.summary.removed + diff.summary.added).toBeGreaterThan(0);
  });
});
