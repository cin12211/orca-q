import { describe, expect, it } from 'vitest';
import {
  HEAD_ROW_HEIGHT,
  ROW_WIDTH,
} from '~/components/modules/erd-diagram/constants';
import { ErdLayoutAlgorithm } from '~/components/modules/erd-diagram/types';
import {
  calcTableHeight,
  computeErdLayout,
} from '~/components/modules/erd-diagram/utils';
import type { TableMetadata } from '~/core/types';

const table = (
  name: string,
  refs: string[] = [],
  columnCount = 3
): TableMetadata => ({
  id: `public.${name}`,
  schema: 'public',
  table: name,
  rows: 0,
  type: 'table',
  comment: null,
  columns: Array.from({ length: columnCount }, (_, i) => ({
    name: `c${i}`,
    ordinal_position: i + 1,
    type: 'int',
    character_maximum_length: null,
    precision: null,
    nullable: true,
    default: null,
    collation: null,
    comment: null,
  })),
  foreign_keys: refs.map(ref => ({
    foreign_key_name: `fk_${name}_${ref}`,
    column: `${ref}_id`,
    reference_schema: 'public',
    reference_table: ref,
    reference_column: 'id',
    fk_def: '',
  })),
  primary_keys: [{ column: 'c0', pk_def: '' }],
  indexes: [],
});

// customers <- orders <- order_items -> products <- categories, plus a
// star around `sales` and two tables with no relations at all.
const fixture = (): TableMetadata[] => [
  table('customers'),
  table('orders', ['customers']),
  table('order_items', ['orders', 'products'], 6),
  table('products', ['categories']),
  table('categories'),
  table('sales', ['dim_date', 'dim_store', 'dim_product', 'dim_customer'], 8),
  table('dim_date'),
  table('dim_store'),
  table('dim_product'),
  table('dim_customer'),
  table('audit_log', [], 10),
  table('settings', [], 1),
  table('self_ref', ['self_ref']),
];

const nonDefault = [
  ErdLayoutAlgorithm.LeftRight,
  ErdLayoutAlgorithm.Pipeline,
  ErdLayoutAlgorithm.Snowflake,
  ErdLayoutAlgorithm.Compact,
];

const rect = (
  positions: Record<string, { x: number; y: number }>,
  t: TableMetadata
) => {
  const p = positions[`public.${t.table}`];
  return {
    x1: p.x,
    y1: p.y,
    x2: p.x + ROW_WIDTH,
    y2: p.y + calcTableHeight(t.columns.length),
  };
};

describe('computeErdLayout', () => {
  it('returns null for the default algorithm', () => {
    expect(
      computeErdLayout(ErdLayoutAlgorithm.Default, { tables: fixture() })
    ).toBeNull();
  });

  it('returns an empty layout for no tables', () => {
    expect(
      computeErdLayout(ErdLayoutAlgorithm.Compact, { tables: [] })
    ).toEqual({});
  });

  it.each(nonDefault)('%s positions every table without overlaps', algo => {
    const tables = fixture();
    const positions = computeErdLayout(algo, { tables })!;

    expect(Object.keys(positions).sort()).toEqual(
      tables.map(t => `public.${t.table}`).sort()
    );

    for (let i = 0; i < tables.length; i++) {
      for (let j = i + 1; j < tables.length; j++) {
        const a = rect(positions, tables[i]);
        const b = rect(positions, tables[j]);
        const overlap =
          a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
        expect(overlap, `${tables[i].table} overlaps ${tables[j].table}`).toBe(
          false
        );
      }
    }
  });

  it('is deterministic', () => {
    for (const algo of nonDefault) {
      expect(computeErdLayout(algo, { tables: fixture() })).toEqual(
        computeErdLayout(algo, { tables: fixture() })
      );
    }
  });

  it('left-to-right puts referenced tables left of referencing ones', () => {
    const p = computeErdLayout(ErdLayoutAlgorithm.LeftRight, {
      tables: fixture(),
    })!;
    expect(p['public.customers'].x).toBeLessThan(p['public.orders'].x);
    expect(p['public.orders'].x).toBeLessThan(p['public.order_items'].x);
    expect(p['public.categories'].x).toBeLessThan(p['public.products'].x);
    // products is tightened next to order_items rather than staying in column 0
    expect(p['public.products'].x).toBe(p['public.orders'].x);
  });

  it('pipeline stages follow dependency depth and are top aligned', () => {
    const p = computeErdLayout(ErdLayoutAlgorithm.Pipeline, {
      tables: fixture(),
    })!;
    const stage0 = ['customers', 'categories', 'dim_date', 'audit_log'];
    for (const name of stage0) expect(p[`public.${name}`].x).toBe(0);
    expect(p['public.orders'].x).toBe(p['public.products'].x);
    expect(p['public.order_items'].x).toBeGreaterThan(p['public.orders'].x);
    const minY = Math.min(...Object.values(p).map(pos => pos.y));
    expect(minY).toBe(0);
  });

  it('snowflake puts the most connected table at the center of its group', () => {
    const p = computeErdLayout(ErdLayoutAlgorithm.Snowflake, {
      tables: fixture(),
    })!;
    const center = (name: string, cols: number) => ({
      x: p[`public.${name}`].x + ROW_WIDTH / 2,
      y: p[`public.${name}`].y + calcTableHeight(cols) / 2,
    });
    const hub = center('sales', 8);
    const dims = [
      center('dim_date', 3),
      center('dim_store', 3),
      center('dim_product', 3),
      center('dim_customer', 3),
    ];
    const avg = {
      x: dims.reduce((s, d) => s + d.x, 0) / dims.length,
      y: dims.reduce((s, d) => s + d.y, 0) / dims.length,
    };
    expect(Math.abs(avg.x - hub.x)).toBeLessThan(1);
    expect(Math.abs(avg.y - hub.y)).toBeLessThan(1);
  });

  it('uses header height for collapsed tables', () => {
    // Pipeline stacks dependency-free tables in one column, so the second
    // table's y reveals the height used for the first.
    const tables = [table('a', [], 20), table('b', [], 20)];
    const collapsed = computeErdLayout(ErdLayoutAlgorithm.Pipeline, {
      tables,
      collapsedHeaderTables: new Set(['public.a']),
    })!;
    const expanded = computeErdLayout(ErdLayoutAlgorithm.Pipeline, {
      tables,
    })!;
    const gap = expanded['public.b'].y - calcTableHeight(20);
    expect(collapsed['public.b'].y).toBe(HEAD_ROW_HEIGHT + gap);
  });
});
