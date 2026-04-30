import { createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  InstanceActionResponse,
  InstanceInsightsConfiguration,
  InstanceInsightsDashboard,
  InstanceInsightsReplication,
  InstanceInsightsState,
  InstanceInsightsView,
  ReplicationSlotDesiredStatus,
} from '~/core/types';
import type { IDatabaseInstanceInsightsAdapter } from '../types';

function getDatabaseLabel(dbType: DatabaseClientType): string {
  switch (dbType) {
    case DatabaseClientType.MYSQL:
      return 'MySQL';
    case DatabaseClientType.MARIADB:
      return 'MariaDB';
    case DatabaseClientType.ORACLE:
      return 'Oracle';
    case DatabaseClientType.SQLITE3:
      return 'SQLite';
    default:
      return dbType;
  }
}

export abstract class BaseUnsupportedInstanceInsightsAdapter
  implements IDatabaseInstanceInsightsAdapter
{
  abstract readonly dbType: DatabaseClientType;

  protected unsupported(operation: string): never {
    throw createError({
      statusCode: 501,
      statusMessage: `${getDatabaseLabel(this.dbType)} instance insights do not support ${operation}`,
      data: {
        dbType: this.dbType,
        feature: 'instance-insights',
        operation,
      },
    });
  }

  async getView(): Promise<InstanceInsightsView> {
    return this.unsupported('loading instance insights');
  }

  async getDashboard(): Promise<InstanceInsightsDashboard> {
    return this.unsupported('loading dashboards');
  }

  async getState(): Promise<InstanceInsightsState> {
    return this.unsupported('loading state');
  }

  async getConfiguration(): Promise<InstanceInsightsConfiguration> {
    return this.unsupported('loading configuration');
  }

  async getReplication(): Promise<InstanceInsightsReplication> {
    return this.unsupported('loading replication details');
  }

  async cancelQuery(_pid: number): Promise<InstanceActionResponse> {
    return this.unsupported('canceling queries');
  }

  async terminateConnection(_pid: number): Promise<InstanceActionResponse> {
    return this.unsupported('terminating connections');
  }

  async dropReplicationSlot(
    _slotName: string
  ): Promise<InstanceActionResponse> {
    return this.unsupported('dropping replication slots');
  }

  async toggleReplicationSlotStatus(_params: {
    slotName: string;
    desiredStatus: ReplicationSlotDesiredStatus;
    activePid?: number | null;
    slotType?: string | null;
  }): Promise<InstanceActionResponse> {
    return this.unsupported('changing replication slot status');
  }
}
