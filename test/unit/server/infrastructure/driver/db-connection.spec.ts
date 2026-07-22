import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  EConnectionMethod,
  ESSLMode,
  ESSHAuthMethod,
  type ISSHConfig,
} from '~/core/types/entities/connection.entity';
import {
  getDatabaseSource,
  healthCheckConnection,
} from '~/server/infrastructure/driver/db-connection';

const {
  closeTunnelMock,
  createDatabaseAdapterMock,
  createSshTunnelMock,
  destroyMock,
  healthCheckMock,
  verifyConnectionMock,
} = vi.hoisted(() => ({
  closeTunnelMock: vi.fn(),
  createDatabaseAdapterMock: vi.fn(),
  createSshTunnelMock: vi.fn(),
  destroyMock: vi.fn(),
  healthCheckMock: vi.fn(),
  verifyConnectionMock: vi.fn(),
}));

vi.mock('~/server/utils/ssh-tunnel', () => ({
  createSshTunnel: createSshTunnelMock,
}));

vi.mock('~/server/infrastructure/driver/factory', () => ({
  createDatabaseAdapter: createDatabaseAdapterMock,
}));

const sshConfig: ISSHConfig = {
  enabled: true,
  host: 'bastion.internal',
  port: 22,
  username: 'ubuntu',
  authMethod: ESSHAuthMethod.PASSWORD,
  password: 'ssh-secret',
};

describe('db connection SSH resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    closeTunnelMock.mockResolvedValue(undefined);
    createSshTunnelMock.mockResolvedValue({
      localHost: '127.0.0.1',
      localPort: 49152,
      close: closeTunnelMock,
    });
    healthCheckMock.mockResolvedValue(true);
    verifyConnectionMock.mockResolvedValue(undefined);
    destroyMock.mockResolvedValue(undefined);
    createDatabaseAdapterMock.mockReturnValue({
      healthCheck: healthCheckMock,
      verifyConnection: verifyConnectionMock,
      destroy: destroyMock,
    });
  });

  it('rewrites STRING health checks through the SSH tunnel before adapter creation', async () => {
    const result = await healthCheckConnection({
      url: 'mysql://app:secret@mysql.internal:3306/heraq',
      type: DatabaseClientType.MYSQL,
      method: EConnectionMethod.STRING,
      ssh: sshConfig,
    });

    expect(result).toEqual({ isConnectedSuccess: true });
    expect(createSshTunnelMock).toHaveBeenCalledWith(
      sshConfig,
      'mysql.internal',
      3306
    );
    expect(createDatabaseAdapterMock).toHaveBeenCalledWith(
      DatabaseClientType.MYSQL,
      'mysql://app:secret@127.0.0.1:49152/heraq',
      expect.any(Object)
    );
    expect(closeTunnelMock).toHaveBeenCalledOnce();
  });

  it('rewrites STRING runtime adapters through the SSH tunnel', async () => {
    const adapter = await getDatabaseSource({
      dbConnectionString: 'mysql://app:secret@mysql.runtime:3306/heraq',
      type: DatabaseClientType.MYSQL,
      ssh: sshConfig,
    });

    expect(adapter).toBe(createDatabaseAdapterMock.mock.results[0].value);
    expect(createSshTunnelMock).toHaveBeenCalledWith(
      sshConfig,
      'mysql.runtime',
      3306
    );
    expect(createDatabaseAdapterMock).toHaveBeenCalledWith(
      DatabaseClientType.MYSQL,
      'mysql://app:secret@127.0.0.1:49152/heraq',
      expect.any(Object)
    );
  });

  it('applies SSL options to MYSQL STRING health checks', async () => {
    const ssl = {
      mode: ESSLMode.REQUIRE,
      rejectUnauthorized: false,
      ca: 'ca-cert',
      cert: 'client-cert',
      key: 'client-key',
    };

    const result = await healthCheckConnection({
      url: 'mysql://app:secret@mysql.internal:3306/heraq',
      type: DatabaseClientType.MYSQL,
      method: EConnectionMethod.STRING,
      ssl,
    });

    expect(result).toEqual({ isConnectedSuccess: true });
    expect(createDatabaseAdapterMock).toHaveBeenCalledWith(
      DatabaseClientType.MYSQL,
      {
        uri: 'mysql://app:secret@mysql.internal:3306/heraq',
        ssl: {
          rejectUnauthorized: false,
          ca: 'ca-cert',
          cert: 'client-cert',
          key: 'client-key',
        },
      },
      expect.any(Object)
    );
  });

  it('applies SSL options to MYSQL STRING runtime adapters after SSH rewriting', async () => {
    const adapter = await getDatabaseSource({
      dbConnectionString: 'mysql://app:secret@mysql.runtime:3306/heraq',
      type: DatabaseClientType.MYSQL,
      ssl: {
        mode: ESSLMode.REQUIRE,
        rejectUnauthorized: false,
      },
      ssh: sshConfig,
    });

    expect(adapter).toBe(createDatabaseAdapterMock.mock.results[0].value);
    expect(createDatabaseAdapterMock).toHaveBeenCalledWith(
      DatabaseClientType.MYSQL,
      {
        uri: 'mysql://app:secret@127.0.0.1:49152/heraq',
        ssl: {
          rejectUnauthorized: false,
          ca: undefined,
          cert: undefined,
          key: undefined,
        },
      },
      expect.any(Object)
    );
  });

  it('wraps Postgres STRING connections with an explicit ssl block', async () => {
    await healthCheckConnection({
      url: 'postgresql://app:secret@pg.internal:5432/heraq',
      type: DatabaseClientType.POSTGRES,
      method: EConnectionMethod.STRING,
      ssl: { mode: ESSLMode.VERIFY_FULL, ca: 'ca-cert' },
    });

    const call = createDatabaseAdapterMock.mock.calls.at(-1);
    expect(call?.[1]).toMatchObject({
      connectionString: 'postgresql://app:secret@pg.internal:5432/heraq',
      ssl: { rejectUnauthorized: true, ca: 'ca-cert' },
    });
  });
});

describe('db connection SSL mode semantics (FORM)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    healthCheckMock.mockResolvedValue(true);
    verifyConnectionMock.mockResolvedValue(undefined);
    destroyMock.mockResolvedValue(undefined);
    createDatabaseAdapterMock.mockReturnValue({
      healthCheck: healthCheckMock,
      verifyConnection: verifyConnectionMock,
      destroy: destroyMock,
    });
  });

  const formArgs = (host: string, ssl: object) => ({
    type: DatabaseClientType.POSTGRES,
    host,
    port: '5432',
    username: 'u',
    password: 'p',
    database: 'd',
    ssl,
  });

  const lastSsl = () =>
    createDatabaseAdapterMock.mock.calls.at(-1)?.[1]?.ssl as
      | Record<string, unknown>
      | undefined;

  it('verify-full forces rejectUnauthorized and keeps hostname check', async () => {
    await getDatabaseSource(
      formArgs('pg-vf.test', { mode: ESSLMode.VERIFY_FULL, ca: 'ca' })
    );
    expect(lastSsl()?.rejectUnauthorized).toBe(true);
    expect(lastSsl()?.ca).toBe('ca');
    expect(lastSsl()?.checkServerIdentity).toBeUndefined();
  });

  it('verify-ca validates chain but skips the hostname check', async () => {
    await getDatabaseSource(
      formArgs('pg-vca.test', { mode: ESSLMode.VERIFY_CA, ca: 'ca' })
    );
    expect(lastSsl()?.rejectUnauthorized).toBe(true);
    expect(typeof lastSsl()?.checkServerIdentity).toBe('function');
  });

  it('require does not reject an untrusted cert by default', async () => {
    await getDatabaseSource(
      formArgs('pg-req.test', { mode: ESSLMode.REQUIRE })
    );
    expect(lastSsl()?.rejectUnauthorized).toBe(false);
  });

  it('require honours an explicit rejectUnauthorized=true', async () => {
    await getDatabaseSource(
      formArgs('pg-req2.test', {
        mode: ESSLMode.REQUIRE,
        rejectUnauthorized: true,
      })
    );
    expect(lastSsl()?.rejectUnauthorized).toBe(true);
  });

  it('omits empty ca/cert/key strings', async () => {
    await getDatabaseSource(
      formArgs('pg-empty.test', {
        mode: ESSLMode.REQUIRE,
        ca: '',
        cert: '',
        key: '',
      })
    );
    expect(lastSsl()).not.toHaveProperty('ca');
    expect(lastSsl()).not.toHaveProperty('cert');
    expect(lastSsl()).not.toHaveProperty('key');
  });
});

describe('db connection adapter cache + tunnel self-heal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    closeTunnelMock.mockResolvedValue(undefined);
    healthCheckMock.mockResolvedValue(true);
    verifyConnectionMock.mockResolvedValue(undefined);
    destroyMock.mockResolvedValue(undefined);
    createDatabaseAdapterMock.mockReturnValue({
      healthCheck: healthCheckMock,
      verifyConnection: verifyConnectionMock,
      destroy: destroyMock,
    });
  });

  it('reuses the cached adapter for identical connections', async () => {
    const args = {
      type: DatabaseClientType.POSTGRES,
      host: 'pg-cache.test',
      port: '5432',
      username: 'u',
      password: 'p',
      database: 'd',
    };

    const a1 = await getDatabaseSource(args);
    const a2 = await getDatabaseSource(args);

    expect(a2).toBe(a1);
    expect(createDatabaseAdapterMock).toHaveBeenCalledTimes(1);
  });

  it('does not open a new SSH tunnel on a cache hit', async () => {
    createSshTunnelMock.mockResolvedValue({
      localHost: '127.0.0.1',
      localPort: 49152,
      close: closeTunnelMock,
      isAlive: () => true,
    });

    const args = {
      type: DatabaseClientType.POSTGRES,
      host: 'pg-cache-ssh.test',
      port: '5432',
      username: 'u',
      password: 'p',
      database: 'd',
      ssh: sshConfig,
    };

    await getDatabaseSource(args);
    await getDatabaseSource(args);

    expect(createSshTunnelMock).toHaveBeenCalledTimes(1);
    expect(createDatabaseAdapterMock).toHaveBeenCalledTimes(1);
  });

  it('rebuilds the adapter when the cached SSH tunnel has died', async () => {
    let alive = true;
    createSshTunnelMock.mockResolvedValue({
      localHost: '127.0.0.1',
      localPort: 49152,
      close: closeTunnelMock,
      isAlive: () => alive,
    });

    const adapterA = {
      healthCheck: healthCheckMock,
      verifyConnection: verifyConnectionMock,
      destroy: destroyMock,
    };
    const adapterB = {
      healthCheck: healthCheckMock,
      verifyConnection: verifyConnectionMock,
      destroy: destroyMock,
    };
    createDatabaseAdapterMock
      .mockReturnValueOnce(adapterA)
      .mockReturnValueOnce(adapterB);

    const args = {
      type: DatabaseClientType.POSTGRES,
      host: 'pg-heal.test',
      port: '5432',
      username: 'u',
      password: 'p',
      database: 'd',
      ssh: sshConfig,
    };

    const first = await getDatabaseSource(args);
    expect(first).toBe(adapterA);

    alive = false; // tunnel drops

    const second = await getDatabaseSource(args);
    expect(second).toBe(adapterB);
    expect(destroyMock).toHaveBeenCalled(); // stale adapter torn down
    expect(createSshTunnelMock).toHaveBeenCalledTimes(2);
  });
});
