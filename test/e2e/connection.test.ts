import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  getD1LiveConnection,
  getTursoLiveConnection,
  hasD1LiveConnection,
  hasTursoLiveConnection,
} from '../support/live-connections';
import { getRedisFixtureConfig } from '../support/nosql-fixtures';

describe('Database Connection E2E', async () => {
  await setup();

  const connectionString = process.env.PG_CONNECTION;
  const redisFixture = getRedisFixtureConfig();

  it('should successfully test a valid PostgreSQL connection string', async () => {
    if (!connectionString) {
      console.warn('PG_CONNECTION not found in environment, skipping test.');
      return;
    }

    const response = await $fetch('/api/managment-connection/health-check', {
      method: 'POST',
      body: {
        type: 'postgres',
        method: 'string',
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
          method: 'form',
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
        method: 'form',
      },
    });

    expect(response).toEqual({ isConnectedSuccess: false });
  });

  it.each([
    {
      label: 'MySQL',
      body: {
        host: 'invalid-host-name-orcaq-test',
        port: '3306',
        username: 'invalid',
        password: 'invalid',
        database: 'invalid',
        type: 'mysql',
        method: 'form',
      },
    },
    {
      label: 'MariaDB',
      body: {
        host: 'invalid-host-name-orcaq-test',
        port: '3306',
        username: 'invalid',
        password: 'invalid',
        database: 'invalid',
        type: 'mariadb',
        method: 'form',
      },
    },
    {
      label: 'Oracle',
      body: {
        host: 'invalid-host-name-orcaq-test',
        port: '1521',
        username: 'invalid',
        password: 'invalid',
        serviceName: 'ORCLPDB1',
        type: 'oracledb',
        method: 'form',
      },
    },
  ])('should fail for an invalid $label form connection', async ({ body }) => {
    const response = await $fetch('/api/managment-connection/health-check', {
      method: 'POST',
      body,
    });

    expect(response.isConnectedSuccess).toBe(false);
  });

  it('should successfully test a valid SQLite file connection', async () => {
    const tempDirectory = await mkdtemp(join(tmpdir(), 'heraq-sqlite-'));
    const filePath = join(tempDirectory, 'app.sqlite');

    await writeFile(filePath, '');

    try {
      const response = await $fetch('/api/managment-connection/health-check', {
        method: 'POST',
        body: {
          type: 'sqlite3',
          method: 'file',
          filePath,
        },
      });

      expect(response).toEqual({ isConnectedSuccess: true });
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  });

  it('should fail with an actionable message for a missing SQLite file', async () => {
    const response = await $fetch('/api/managment-connection/health-check', {
      method: 'POST',
      body: {
        type: 'sqlite3',
        method: 'file',
        filePath: '/tmp/heraq-missing-test.sqlite',
      },
    });

    expect(response.isConnectedSuccess).toBe(false);
    expect(response.message).toContain('SQLite database file was not found');
  });

  it('should successfully test a valid Redis connection string against the local fixture', async () => {
    const response = await $fetch('/api/managment-connection/health-check', {
      method: 'POST',
      body: {
        type: 'redis',
        method: 'string',
        stringConnection: redisFixture.url,
      },
    });

    expect(response).toEqual({ isConnectedSuccess: true });
  });

  it('should successfully test a valid Redis form connection against the local fixture', async () => {
    const response = await $fetch('/api/managment-connection/health-check', {
      method: 'POST',
      body: {
        type: 'redis',
        method: 'form',
        host: redisFixture.host,
        port: `${redisFixture.port}`,
        username: redisFixture.username,
        password: redisFixture.password,
        database: `${redisFixture.database}`,
      },
    });

    expect(response).toEqual({ isConnectedSuccess: true });
  });

  it('should successfully test a valid Cloudflare D1 managed SQLite connection when live credentials are configured', async () => {
    if (!hasD1LiveConnection()) {
      console.warn(
        'D1 live credentials not found in environment, skipping test.'
      );
      return;
    }

    const d1Connection = getD1LiveConnection();
    const response = await $fetch('/api/managment-connection/health-check', {
      method: 'POST',
      body: {
        type: 'sqlite3',
        method: 'managed',
        providerKind: 'cloudflare-d1',
        managedSqlite: {
          provider: d1Connection.provider,
          accountId: d1Connection.accountId,
          databaseId: d1Connection.databaseId,
          apiToken: d1Connection.apiToken,
        },
      },
    });

    expect(response).toEqual({ isConnectedSuccess: true });
  });

  it('should successfully test a valid Turso managed SQLite connection when live credentials are configured', async () => {
    if (!hasTursoLiveConnection()) {
      console.warn(
        'Turso live credentials not found in environment, skipping test.'
      );
      return;
    }

    const tursoConnection = getTursoLiveConnection();
    const response = await $fetch('/api/managment-connection/health-check', {
      method: 'POST',
      body: {
        type: 'sqlite3',
        method: 'managed',
        providerKind: 'turso',
        managedSqlite: {
          provider: tursoConnection.provider,
          url: tursoConnection.url,
          authToken: tursoConnection.authToken,
          branchName: tursoConnection.branchName,
        },
      },
    });

    expect(response).toEqual({ isConnectedSuccess: true });
  });
});
