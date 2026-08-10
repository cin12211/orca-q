import { describe, expect, it } from 'vitest';
import { RedshiftTableAdapter } from '~/server/infrastructure/database/adapters/tables/redshift/redshift-table.adapter';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';

const fakeAdapter = {
  rawQuery: async () => [],
} as unknown as IDatabaseAdapter;

describe('RedshiftTableAdapter', () => {
  it('reports RLS as disabled (Redshift has no row-level security)', async () => {
    const adapter = new RedshiftTableAdapter(fakeAdapter);
    const status = await adapter.getTableRlsStatus('public', 'orders');
    expect(status).toEqual({ enabled: false });
  });

  it('returns no RLS policies', async () => {
    const adapter = new RedshiftTableAdapter(fakeAdapter);
    const policies = await adapter.getTableRlsPolicies('public', 'orders');
    expect(policies).toEqual([]);
  });

  it('returns no rules (Redshift has no CREATE RULE support)', async () => {
    const adapter = new RedshiftTableAdapter(fakeAdapter);
    const rules = await adapter.getTableRules('public', 'orders');
    expect(rules).toEqual([]);
  });

  it('returns no triggers (Redshift has no trigger support)', async () => {
    const adapter = new RedshiftTableAdapter(fakeAdapter);
    const triggers = await adapter.getTableTriggers('public', 'orders');
    expect(triggers).toEqual([]);
  });
});
