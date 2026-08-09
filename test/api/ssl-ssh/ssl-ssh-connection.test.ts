import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { readFileSync } from 'node:fs';
import { connect } from 'node:net';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

// NOTE: the integration Vitest project does not resolve the `~` alias, and app
// modules import through it, so we use the enums' underlying string values
// directly instead of importing them.
const DatabaseClientType = {
  POSTGRES: 'postgres',
  MYSQL: 'mysql',
  MARIADB: 'mariadb',
} as const;
type DatabaseClientType =
  (typeof DatabaseClientType)[keyof typeof DatabaseClientType];

const EConnectionMethod = { FORM: 'form', STRING: 'string' } as const;
const ESSHAuthMethod = { KEY: 'key', PASSWORD: 'password' } as const;
const ESSLMode = {
  DISABLE: 'disable',
  REQUIRE: 'require',
  VERIFY_CA: 'verify-ca',
  VERIFY_FULL: 'verify-full',
} as const;

// =============================================================================
// End-to-end SSL + SSH connection tests.
//
// Requires the standalone fixture to be running:
//   cd test/fixtures/ssl-ssh && ./start.sh
//
// The whole suite auto-skips when the SSH bastion (localhost:2222) is not
// reachable, so it never fails a normal `bun test:api` run where this fixture
// is not up.
//
// Run just this file:
//   bunx vitest --run --project integration test/api/ssl-ssh
// =============================================================================

const FIXTURE_DIR = join(process.cwd(), 'test/fixtures/ssl-ssh');
const BASTION_PORT = 2222;

function canReach(host: string, port: number, timeout = 500): Promise<boolean> {
  return new Promise(resolve => {
    const socket = connect({ host, port });
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeout);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

function readFixtureFile(relPath: string): string {
  return readFileSync(join(FIXTURE_DIR, relPath), 'utf8');
}

const fixtureUp = await canReach('127.0.0.1', BASTION_PORT);

if (!fixtureUp) {
  // eslint-disable-next-line no-console
  console.warn(
    `[ssl-ssh] Bastion not reachable on :${BASTION_PORT} — skipping. Run test/fixtures/ssl-ssh/start.sh first.`
  );
}

interface EngineCase {
  label: string;
  type: DatabaseClientType;
  // Host/port as the SSH bastion resolves it (docker service name) — used for
  // every case that goes through the SSH tunnel.
  tunnelHost: string;
  tunnelPort: string;
  // Host/port exposed directly on the docker host — used for the "no SSH"
  // direct-SSL cases. Must NOT be combined with ssh.enabled (nothing listens
  // on this port from inside the bastion's own network namespace).
  directPort: string;
  scheme: string;
}

const ENGINES: EngineCase[] = [
  {
    label: 'PostgreSQL',
    type: DatabaseClientType.POSTGRES,
    tunnelHost: 'postgres',
    tunnelPort: '5432',
    directPort: '55432',
    scheme: 'postgresql',
  },
  {
    label: 'MySQL',
    type: DatabaseClientType.MYSQL,
    tunnelHost: 'mysql',
    tunnelPort: '3306',
    directPort: '33306',
    scheme: 'mysql',
  },
  {
    label: 'MariaDB',
    type: DatabaseClientType.MARIADB,
    tunnelHost: 'mariadb',
    tunnelPort: '3306',
    directPort: '33307',
    scheme: 'mariadb',
  },
];

const DB_CREDS = { username: 'orcaq', password: 'orcaq', database: 'orcaq' };

describe.skipIf(!fixtureUp)('SSL + SSH connection E2E', async () => {
  await setup();

  const privateKey = fixtureUp ? readFixtureFile('certs/id_ssh') : '';
  const caCert = fixtureUp ? readFixtureFile('certs/ca.crt') : '';

  const sshKey = () => ({
    enabled: true,
    host: 'localhost',
    port: BASTION_PORT,
    username: 'tunnel',
    authMethod: ESSHAuthMethod.KEY,
    privateKey,
    useSshKey: true,
  });

  const sshPassword = () => ({
    enabled: true,
    host: 'localhost',
    port: BASTION_PORT,
    username: 'tunnel',
    authMethod: ESSHAuthMethod.PASSWORD,
    password: 'tunnel',
    useSshKey: false,
  });

  const healthCheck = (body: Record<string, unknown>) =>
    $fetch<{
      isConnectedSuccess: boolean;
      message?: string;
      hint?: string;
      detail?: string;
    }>('/api/managment-connection/health-check', { method: 'POST', body });

  const formBody = (engine: EngineCase, host: string, port: string) => ({
    type: engine.type,
    method: EConnectionMethod.FORM,
    host,
    port,
    ...DB_CREDS,
  });

  // Builds a connection string the way the "Connection String" tab actually
  // does — sslmode baked into the query string, not passed as a side-channel
  // `ssl` field. This is the realistic UI path and is what previously hit the
  // pg-connection-string clobber bug (explicit `ssl` object silently
  // overridden by `?sslmode=` re-parsed out of the string itself).
  const connString = (
    engine: EngineCase,
    host: string,
    port: string,
    sslmode: string
  ) =>
    `${engine.scheme}://orcaq:orcaq@${host}:${port}/orcaq?sslmode=${sslmode}`;

  for (const engine of ENGINES) {
    describe(engine.label, () => {
      describe('Form method — SSH tunnel', () => {
        it('connects with SSL require + SSH key auth', async () => {
          const res = await healthCheck({
            ...formBody(engine, engine.tunnelHost, engine.tunnelPort),
            ssl: { mode: ESSLMode.REQUIRE },
            ssh: sshKey(),
          });
          expect(res.isConnectedSuccess, res.message).toBe(true);
        });

        it('connects with SSL require + SSH password auth', async () => {
          const res = await healthCheck({
            ...formBody(engine, engine.tunnelHost, engine.tunnelPort),
            ssl: { mode: ESSLMode.REQUIRE },
            ssh: sshPassword(),
          });
          expect(res.isConnectedSuccess, res.message).toBe(true);
        });

        it('connects with SSL verify-ca + CA + SSH key auth', async () => {
          const res = await healthCheck({
            ...formBody(engine, engine.tunnelHost, engine.tunnelPort),
            ssl: { mode: ESSLMode.VERIFY_CA, ca: caCert },
            ssh: sshKey(),
          });
          expect(res.isConnectedSuccess, res.message).toBe(true);
        });

        it('connects with SSL verify-full + CA + SSH key auth', async () => {
          const res = await healthCheck({
            ...formBody(engine, engine.tunnelHost, engine.tunnelPort),
            ssl: { mode: ESSLMode.VERIFY_FULL, ca: caCert },
            ssh: sshKey(),
          });
          expect(res.isConnectedSuccess, res.message).toBe(true);
        });

        it('fails verify-full when no CA is provided (untrusted cert)', async () => {
          const res = await healthCheck({
            ...formBody(engine, engine.tunnelHost, engine.tunnelPort),
            ssl: { mode: ESSLMode.VERIFY_FULL },
            ssh: sshKey(),
          });
          expect(res.isConnectedSuccess).toBe(false);
          // Normalized, actionable error surfaced to the form.
          expect(res.message).toMatch(/certificate could not be verified/i);
          expect(res.hint).toBeTruthy();
          expect(res.detail).toBeTruthy();
        });

        it('fails when SSL is disabled (server requires SSL)', async () => {
          const res = await healthCheck({
            ...formBody(engine, engine.tunnelHost, engine.tunnelPort),
            ssl: { mode: ESSLMode.DISABLE },
            ssh: sshKey(),
          });
          expect(res.isConnectedSuccess).toBe(false);
          expect(res.message).toMatch(/requires an ssl/i);
          expect(res.hint).toMatch(/enable ssl/i);
        });

        it('returns a normalized auth error for a wrong password', async () => {
          const res = await healthCheck({
            ...formBody(engine, engine.tunnelHost, engine.tunnelPort),
            password: 'definitely-wrong',
            ssl: { mode: ESSLMode.REQUIRE },
            ssh: sshKey(),
          });
          expect(res.isConnectedSuccess).toBe(false);
          expect(res.message).toMatch(/authentication failed/i);
          expect(res.hint).toBeTruthy();
        });
      });

      describe('Form method — direct (no SSH)', () => {
        it('connects with SSL require against the exposed direct port', async () => {
          const res = await healthCheck({
            ...formBody(engine, 'localhost', engine.directPort),
            ssl: { mode: ESSLMode.REQUIRE },
          });
          expect(res.isConnectedSuccess, res.message).toBe(true);
        });

        it('connects with SSL verify-full + CA against the exposed direct port', async () => {
          const res = await healthCheck({
            ...formBody(engine, 'localhost', engine.directPort),
            ssl: { mode: ESSLMode.VERIFY_FULL, ca: caCert },
          });
          expect(res.isConnectedSuccess, res.message).toBe(true);
        });

        it('fails when SSL is disabled against the exposed direct port', async () => {
          const res = await healthCheck({
            ...formBody(engine, 'localhost', engine.directPort),
            ssl: { mode: ESSLMode.DISABLE },
          });
          expect(res.isConnectedSuccess).toBe(false);
          expect(res.message).toMatch(/requires an ssl/i);
        });
      });

      describe('Connection string method — SSH tunnel', () => {
        // Regression coverage: sslmode baked directly into the URL (the real
        // UI path), not passed only as a side-channel `ssl` field.
        it('connects with sslmode=require embedded in the URL + SSH key auth', async () => {
          const res = await healthCheck({
            type: engine.type,
            method: EConnectionMethod.STRING,
            stringConnection: connString(
              engine,
              engine.tunnelHost,
              engine.tunnelPort,
              'require'
            ),
            ssh: sshKey(),
          });
          expect(res.isConnectedSuccess, res.message).toBe(true);
        });

        it('connects with sslmode=require embedded in the URL + SSH password auth', async () => {
          const res = await healthCheck({
            type: engine.type,
            method: EConnectionMethod.STRING,
            stringConnection: connString(
              engine,
              engine.tunnelHost,
              engine.tunnelPort,
              'require'
            ),
            ssh: sshPassword(),
          });
          expect(res.isConnectedSuccess, res.message).toBe(true);
        });

        it('connects via explicit ssl field + SSL verify-full + CA + SSH key', async () => {
          const res = await healthCheck({
            type: engine.type,
            method: EConnectionMethod.STRING,
            stringConnection: `${engine.scheme}://orcaq:orcaq@${engine.tunnelHost}:${engine.tunnelPort}/orcaq`,
            ssl: { mode: ESSLMode.VERIFY_FULL, ca: caCert },
            ssh: sshKey(),
          });
          expect(res.isConnectedSuccess, res.message).toBe(true);
        });
      });

      describe('Connection string method — direct (no SSH)', () => {
        it('connects with sslmode=require embedded in the URL against the exposed direct port', async () => {
          const res = await healthCheck({
            type: engine.type,
            method: EConnectionMethod.STRING,
            stringConnection: connString(
              engine,
              'localhost',
              engine.directPort,
              'require'
            ),
          });
          expect(res.isConnectedSuccess, res.message).toBe(true);
        });

        it('fails with sslmode=disable against the exposed direct port', async () => {
          const res = await healthCheck({
            type: engine.type,
            method: EConnectionMethod.STRING,
            stringConnection: connString(
              engine,
              'localhost',
              engine.directPort,
              'disable'
            ),
          });
          expect(res.isConnectedSuccess).toBe(false);
        });
      });
    });
  }
});
