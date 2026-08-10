import { describe, expect, it } from 'vitest';
import { CockroachTableAdapter } from '~/server/infrastructure/database/adapters/tables/cockroachdb/cockroachdb-table.adapter';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';

const fakeAdapter = {
  rawQuery: async () => [],
} as unknown as IDatabaseAdapter;

describe('CockroachTableAdapter', () => {
  it('reports RLS as disabled', async () => {
    const adapter = new CockroachTableAdapter(fakeAdapter);
    const status = await adapter.getTableRlsStatus('public', 'orders');
    expect(status).toEqual({ enabled: false });
  });

  it('returns no RLS policies', async () => {
    const adapter = new CockroachTableAdapter(fakeAdapter);
    const policies = await adapter.getTableRlsPolicies('public', 'orders');
    expect(policies).toEqual([]);
  });

  it('returns no rules (CockroachDB has no CREATE RULE support)', async () => {
    const adapter = new CockroachTableAdapter(fakeAdapter);
    const rules = await adapter.getTableRules('public', 'orders');
    expect(rules).toEqual([]);
  });

  it('returns no triggers (CockroachDB has no trigger support)', async () => {
    const adapter = new CockroachTableAdapter(fakeAdapter);
    const triggers = await adapter.getTableTriggers('public', 'orders');
    expect(triggers).toEqual([]);
  });
});
