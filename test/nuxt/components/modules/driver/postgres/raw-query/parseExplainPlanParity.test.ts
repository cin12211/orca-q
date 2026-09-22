import { describe, expect, it } from 'vitest';
import {
  extractExplainPayload,
  extractExplainText,
  parseExplainPlan,
} from '~/components/modules/driver/postgres/raw-query/explain/utils/parseExplainPlan';

// A representative EXPLAIN (ANALYZE, FORMAT JSON) payload as PostgreSQL
// returns it through the result tab (single row, single JSON column).
// The expected values below were captured from this same parser before the
// duplicated core copy was deleted in Task 15.
const EXPLAIN_ROWS = [
  {
    'QUERY PLAN': [
      {
        Plan: {
          'Node Type': 'Hash Join',
          'Parallel Aware': false,
          'Join Type': 'Inner',
          'Startup Cost': 1.09,
          'Total Cost': 21.3,
          'Plan Rows': 200,
          'Plan Width': 64,
          'Actual Startup Time': 0.05,
          'Actual Total Time': 1.42,
          'Actual Rows': 180,
          'Actual Loops': 1,
          'Hash Cond': '(o.user_id = u.id)',
          'Shared Hit Blocks': 12,
          'Shared Read Blocks': 3,
          Plans: [
            {
              'Node Type': 'Seq Scan',
              'Parent Relationship': 'Outer',
              'Relation Name': 'orders',
              Alias: 'o',
              'Startup Cost': 0,
              'Total Cost': 15.5,
              'Plan Rows': 550,
              'Plan Width': 32,
              'Actual Startup Time': 0.01,
              'Actual Total Time': 0.6,
              'Actual Rows': 550,
              'Actual Loops': 1,
              Filter: '(status = 1)',
              'Rows Removed by Filter': 20,
            },
            {
              'Node Type': 'Hash',
              'Parent Relationship': 'Inner',
              'Startup Cost': 1.04,
              'Total Cost': 1.04,
              'Plan Rows': 4,
              'Plan Width': 36,
              'Actual Startup Time': 0.02,
              'Actual Total Time': 0.02,
              'Actual Rows': 4,
              'Actual Loops': 1,
              'Hash Buckets': 1024,
              'Hash Batches': 1,
              'Peak Memory Usage': 9,
              Plans: [
                {
                  'Node Type': 'Seq Scan',
                  'Parent Relationship': 'Outer',
                  'Relation Name': 'users',
                  Alias: 'u',
                  'Startup Cost': 0,
                  'Total Cost': 1.04,
                  'Plan Rows': 4,
                  'Plan Width': 36,
                  'Actual Startup Time': 0.01,
                  'Actual Total Time': 0.01,
                  'Actual Rows': 4,
                  'Actual Loops': 1,
                },
              ],
            },
          ],
        },
        Settings: { effective_cache_size: '4GB' },
        'Planning Time': 0.31,
        'Execution Time': 1.68,
      },
    ],
  },
];

const FIELD_DEFS = [{ name: 'QUERY PLAN' }] as never;

describe('driver parseExplainPlan', () => {
  it('extracts the JSON payload and its pretty-printed text', () => {
    const payload = extractExplainPayload(EXPLAIN_ROWS, FIELD_DEFS);

    expect(payload).toEqual(EXPLAIN_ROWS[0]['QUERY PLAN']);
    expect(extractExplainText(EXPLAIN_ROWS, FIELD_DEFS)).toBe(
      JSON.stringify(EXPLAIN_ROWS[0]['QUERY PLAN'], null, 2)
    );
  });

  it('parses the plan tree into annotated nodes', () => {
    const payload = extractExplainPayload(EXPLAIN_ROWS, FIELD_DEFS);

    const parsed = parseExplainPlan(payload);

    expect(parsed.allNodes).toHaveLength(4);
    expect(
      parsed.allNodes.map(node => ({
        id: node.id,
        index: node.index,
        label: node.label,
        depth: node.depth,
        isSlowest: node.isSlowest,
        isExpensive: node.isExpensive,
        estimateRatio: node.estimateRatio,
        rowEstimateAccuracy: node.rowEstimateAccuracy,
      }))
    ).toEqual([
      {
        id: 'ep-1',
        index: 1,
        label: 'Hash Join',
        depth: 0,
        isSlowest: true,
        isExpensive: false,
        estimateRatio: 0.9,
        rowEstimateAccuracy: 'accurate',
      },
      {
        id: 'ep-2',
        index: 2,
        label: 'Seq Scan on orders',
        depth: 1,
        isSlowest: false,
        isExpensive: false,
        estimateRatio: 1,
        rowEstimateAccuracy: 'accurate',
      },
      {
        id: 'ep-3',
        index: 3,
        label: 'Hash',
        depth: 1,
        isSlowest: false,
        isExpensive: false,
        estimateRatio: 1,
        rowEstimateAccuracy: 'accurate',
      },
      {
        id: 'ep-4',
        index: 4,
        label: 'Seq Scan on users',
        depth: 2,
        isSlowest: false,
        isExpensive: false,
        estimateRatio: 1,
        rowEstimateAccuracy: 'accurate',
      },
    ]);
  });

  it('keeps the tree shape and the plan summary', () => {
    const payload = extractExplainPayload(EXPLAIN_ROWS, FIELD_DEFS);

    const parsed = parseExplainPlan(payload);

    expect(parsed.root?.id).toBe('ep-1');
    expect(parsed.root?.hitReadRatio).toBe(0.8);
    expect(parsed.root?.children.map(child => child.id)).toEqual([
      'ep-2',
      'ep-3',
    ]);
    expect(parsed.root?.children[1].children.map(child => child.id)).toEqual([
      'ep-4',
    ]);

    expect(parsed.summary).toMatchObject({
      'Planning Time': 0.31,
      'Execution Time': 1.68,
      totalCost: 21.3,
      triggersInfo: [],
      jitInfo: [],
      settingsInfo: ['effective_cache_size: 4GB'],
    });
    expect(parsed.summary?.rawText).toBe(
      extractExplainText(EXPLAIN_ROWS, FIELD_DEFS)
    );
  });
});
