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

const EConnectionMethod = { FORM: 'form' } as const;
const ESSHAuthMethod = { KEY: 'key', PASSWORD: 'password' } as const;
const ESSLMode = {
  DISABLE: 'disable',
  REQUIRE: 'require',
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
  host: string; // host as the SSH bastion resolves it (docker service name)
  port: string;
}

const ENGINES: EngineCase[] = [
  {
    label: 'PostgreSQL',
    type: DatabaseClientType.POSTGRES,
    host: 'postgres',
    port: '5432',
  },
  {
    label: 'MySQL',
    type: DatabaseClientType.MYSQL,
    host: 'mysql',
    port: '3306',
  },
  {
    label: 'MariaDB',
    type: DatabaseClientType.MARIADB,
    host: 'mariadb',
    port: '3306',
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
    $fetch<{ isConnectedSuccess: boolean; message?: string }>(
      '/api/managment-connection/health-check',
      { method: 'POST', body }
    );

  const baseBody = (engine: EngineCase) => ({
    type: engine.type,
    method: EConnectionMethod.FORM,
    host: engine.host,
    port: engine.port,
    ...DB_CREDS,
  });

  for (const engine of ENGINES) {
    describe(engine.label, () => {
      it('connects with SSL require + SSH key auth', async () => {
        const res = await healthCheck({
          ...baseBody(engine),
          ssl: { mode: ESSLMode.REQUIRE },
          ssh: sshKey(),
        });
        expect(res.isConnectedSuccess, res.message).toBe(true);
      });

      it('connects with SSL require + SSH password auth', async () => {
        const res = await healthCheck({
          ...baseBody(engine),
          ssl: { mode: ESSLMode.REQUIRE },
          ssh: sshPassword(),
        });
        expect(res.isConnectedSuccess, res.message).toBe(true);
      });

      it('connects with SSL verify-full + CA + SSH key auth', async () => {
        const res = await healthCheck({
          ...baseBody(engine),
          ssl: { mode: ESSLMode.VERIFY_FULL, ca: caCert },
          ssh: sshKey(),
        });
        expect(res.isConnectedSuccess, res.message).toBe(true);
      });

      it('fails verify-full when no CA is provided (untrusted cert)', async () => {
        const res = await healthCheck({
          ...baseBody(engine),
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
          ...baseBody(engine),
          ssl: { mode: ESSLMode.DISABLE },
          ssh: sshKey(),
        });
        expect(res.isConnectedSuccess).toBe(false);
        expect(res.message).toMatch(/requires an ssl/i);
        expect(res.hint).toMatch(/enable ssl/i);
      });

      it('returns a normalized auth error for a wrong password', async () => {
        const res = await healthCheck({
          ...baseBody(engine),
          password: 'definitely-wrong',
          ssl: { mode: ESSLMode.REQUIRE },
          ssh: sshKey(),
        });
        expect(res.isConnectedSuccess).toBe(false);
        expect(res.message).toMatch(/authentication failed/i);
        expect(res.hint).toBeTruthy();
      });

      // Connection-string method: exercises applyConnectionStringSsl, where
      // Postgres SSL was previously dropped (bug #7).
      it('connects via connection string + SSL verify-full + CA + SSH key', async () => {
        const connString = `mysql://orcaq:orcaq@${engine.host}:${engine.port}/orcaq`;
        const pgConnString = `postgresql://orcaq:orcaq@${engine.host}:${engine.port}/orcaq`;
        const res = await healthCheck({
          type: engine.type,
          method: 'string',
          stringConnection:
            engine.type === DatabaseClientType.POSTGRES
              ? pgConnString
              : connString,
          ssl: { mode: ESSLMode.VERIFY_FULL, ca: caCert },
          ssh: sshKey(),
        });
        expect(res.isConnectedSuccess, res.message).toBe(true);
      });
    });
  }
});
