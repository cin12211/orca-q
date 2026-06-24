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
} = vi.hoisted(() => ({
  closeTunnelMock: vi.fn(),
  createDatabaseAdapterMock: vi.fn(),
  createSshTunnelMock: vi.fn(),
  destroyMock: vi.fn(),
  healthCheckMock: vi.fn(),
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
    destroyMock.mockResolvedValue(undefined);
    createDatabaseAdapterMock.mockReturnValue({
      healthCheck: healthCheckMock,
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
});
