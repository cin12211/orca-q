import { describe, it, expect } from 'vitest';
import { setup, $fetch } from '@nuxt/test-utils/e2e';

describe('Database Connection E2E', async () => {
  await setup();

  const connectionString = process.env.PG_CONNECTION;

  it('should successfully test a valid PostgreSQL connection string', async () => {
    if (!connectionString) {
      console.warn('PG_CONNECTION not found in environment, skipping test.');
      return;
    }

    const response = await $fetch('/api/managment-connection/health-check', {
      method: 'POST',
      body: {
        stringConnection: connectionString,
      },
    });

    expect(response).toEqual({ isConnectedSuccess: true });
  });

  it('should successfully test a valid PostgreSQL connection using form details', async () => {
    if (!connectionString) {
      console.warn('PG_CONNECTION not found in environment, skipping test.');
      return;
    }

    // Basic parsing of the connection string for the test
    // format: postgresql://user:pass@host:port/db?sslmode=require
    try {
      const url = new URL(connectionString);
      const sslMode = url.searchParams.get('sslmode');

      const response = await $fetch('/api/managment-connection/health-check', {
        method: 'POST',
        body: {
          host: url.hostname,
          port: url.port || '5432',
          username: decodeURIComponent(url.username),
          password: decodeURIComponent(url.password),
          database: decodeURIComponent(url.pathname.slice(1)),
          type: 'postgres',
          ssl: sslMode ? { mode: sslMode } : undefined,
        },
      });

      expect(response).toEqual({ isConnectedSuccess: true });
    } catch (e) {
      console.error('Failed to parse connection string:', e);
      throw e;
    }
  });

  it('should fail for an invalid connection', async () => {
    const response = await $fetch('/api/managment-connection/health-check', {
      method: 'POST',
      body: {
        host: 'invalid-host-name-orcaq-test',
        port: '5432',
        username: 'invalid',
        password: 'invalid',
        database: 'invalid',
        type: 'postgres',
      },
    });

    expect(response).toEqual({ isConnectedSuccess: false });
  });
});
