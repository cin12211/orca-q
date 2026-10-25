import type { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  EConnectionMethod,
  IBrokerConfig,
  ISSHConfig,
  ISSLConfig,
} from '../types';
import type { ConnectionHealthCheckResult } from './connection.service';

export interface BrokerHealthCheckBody {
  type: DatabaseClientType.RABBITMQ | DatabaseClientType.KAFKA;
  method: EConnectionMethod.FORM;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
  broker: IBrokerConfig;
}

export const brokerConnectionService = {
  healthCheck: (body: BrokerHealthCheckBody) =>
    $fetch<ConnectionHealthCheckResult>(
      '/api/managment-connection/health-check',
      { method: 'POST', body }
    ),
};
