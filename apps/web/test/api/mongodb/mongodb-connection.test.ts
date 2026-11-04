import { $fetch, setup } from '@nuxt/test-utils/e2e';
import { describe, expect, it } from 'vitest';
import { mongoConfig, mongoHealthCheckBody } from '../support/mongo-connection';

describe('MongoDB Connection E2E', async () => {
  await setup();

  describe('POST /api/managment-connection/health-check', () => {
    it('connects successfully with form details', async () => {
      const res = await $fetch('/api/managment-connection/health-check', {
        method: 'POST',
        body: mongoHealthCheckBody(),
      });

      expect(res).toEqual({ isConnectedSuccess: true });
    });

    it('connects successfully with a connection string', async () => {
      const res = await $fetch('/api/managment-connection/health-check', {
        method: 'POST',
        body: {
          type: 'mongodb',
          method: 'string',
          stringConnection: mongoConfig.url,
        },
      });

      expect(res).toEqual({ isConnectedSuccess: true });
    });

    it('fails for an unreachable host', async () => {
      const res = await $fetch('/api/managment-connection/health-check', {
        method: 'POST',
        body: mongoHealthCheckBody({ host: '127.0.0.1', port: '1' }),
      });

      expect(res.isConnectedSuccess).toBe(false);
    });
  });
});
