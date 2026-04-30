import {
  getConnectionCapabilityProfile,
  resolveConnectionFamily,
  resolveConnectionProviderKind,
} from '~/core/constants/connection-capabilities';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  EConnectionFamily,
  EConnectionMethod,
  EConnectionProviderKind,
  type IManagedSqliteConfig,
  type ISSHConfig,
  type ISSLConfig,
} from '../types';

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
    }
  | {
      type: DatabaseClientType.SQLITE3;
      method: EConnectionMethod.MANAGED;
      providerKind:
        | EConnectionProviderKind.CLOUDFLARE_D1
        | EConnectionProviderKind.TURSO;
      managedSqlite: IManagedSqliteConfig;
    };

export type ResolvedConnectionHealthCheckBody = ConnectionHealthCheckBody & {
  providerKind: EConnectionProviderKind;
  family: EConnectionFamily;
};

type ManagedConnectionHealthCheckBody = Extract<
  ConnectionHealthCheckBody,
  { method: EConnectionMethod.MANAGED }
>;

export function resolveConnectionHealthCheckBody(
  body: ConnectionHealthCheckBody
): ResolvedConnectionHealthCheckBody {
  const providerKind = resolveConnectionProviderKind({
    type: body.type,
    method: body.method,
    providerKind: 'providerKind' in body ? body.providerKind : undefined,
    managedSqlite: 'managedSqlite' in body ? body.managedSqlite : undefined,
  });
  const family = resolveConnectionFamily({
    type: body.type,
    method: body.method,
    providerKind,
    managedSqlite: 'managedSqlite' in body ? body.managedSqlite : undefined,
  });

  if (body.method === EConnectionMethod.MANAGED) {
    return {
      ...body,
      providerKind:
        providerKind as ManagedConnectionHealthCheckBody['providerKind'],
      family,
    };
  }

  return {
    ...body,
    providerKind,
    family,
  };
}

export function getConnectionHealthCheckCapabilities(
  body: ConnectionHealthCheckBody
) {
  return getConnectionCapabilityProfile(resolveConnectionHealthCheckBody(body));
}

export const connectionService = {
  healthCheck: (body: ConnectionHealthCheckBody) =>
    $fetch<{ isConnectedSuccess: boolean; message?: string }>(
      '/api/managment-connection/health-check',
      {
        method: 'POST',
        body: resolveConnectionHealthCheckBody(body),
      }
    ),
};
