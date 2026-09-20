import { $fetch, setup } from '@nuxt/test-utils/e2e';
import { describe, expect, it } from 'vitest';
import { mongoBody } from '../support/mongo-connection';

describe('MongoDB Instance Insights API E2E', async () => {
  await setup();

  describe('POST /api/mongodb/instance-insights/overview', () => {
    it('returns server version, topology and connection metrics', async () => {
      const res = await $fetch<{
        version: string;
        uptimeSeconds: number;
        topology: string;
        connections: { current: number; available: number } | null;
        warnings: string[];
      }>('/api/mongodb/instance-insights/overview', {
        method: 'POST',
        body: mongoBody(),
      });

      expect(res.version).toMatch(/^\d+\./);
      expect(res.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(res.topology).toBe('standalone');
      expect(res.connections?.current).toBeGreaterThan(0);
      expect(res.warnings).toEqual([]);
    });
  });
});
