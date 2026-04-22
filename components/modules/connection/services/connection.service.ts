import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { EConnectionMethod, ISSHConfig, ISSLConfig } from '../types';

export type ConnectionHealthCheckBody =
  | {
      type: DatabaseClientType;
      method: EConnectionMethod.STRING;
      stringConnection: string;
    }
  | {
      type: DatabaseClientType;
      method: EConnectionMethod.FORM;
      host: string;
      port?: string;
      username: string;
      password?: string;
      database?: string;
      serviceName?: string;
      ssl?: ISSLConfig;
      ssh?: ISSHConfig;
    }
  | {
      type: DatabaseClientType.SQLITE3;
      method: EConnectionMethod.FILE;
      filePath: string;
    };

export const connectionService = {
  healthCheck: (body: ConnectionHealthCheckBody) =>
    $fetch<{ isConnectedSuccess: boolean; message?: string }>(
      '/api/managment-connection/health-check',
      {
        method: 'POST',
        body,
      }
    ),
};
