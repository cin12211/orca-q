import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  InstanceActionResponse,
  InstanceInsightsConfiguration,
  InstanceInsightsDashboard,
  InstanceInsightsReplication,
  InstanceInsightsState,
  ReplicationSlotDesiredStatus,
} from '~/core/types';
import type { BaseDatabaseAdapterParams } from '../shared';

export type InstanceInsightsAdapterParams = BaseDatabaseAdapterParams;

export interface InstanceInsightsConfigurationOptions {
  search?: string;
  limit?: number;
}

export interface IDatabaseInstanceInsightsAdapter {
  readonly dbType: DatabaseClientType;
  getDashboard(): Promise<InstanceInsightsDashboard>;
  getState(): Promise<InstanceInsightsState>;
  getConfiguration(
    options?: InstanceInsightsConfigurationOptions
  ): Promise<InstanceInsightsConfiguration>;
  getReplication(): Promise<InstanceInsightsReplication>;
  cancelQuery(pid: number): Promise<InstanceActionResponse>;
  terminateConnection(pid: number): Promise<InstanceActionResponse>;
  dropReplicationSlot(slotName: string): Promise<InstanceActionResponse>;
  toggleReplicationSlotStatus(params: {
    slotName: string;
    desiredStatus: ReplicationSlotDesiredStatus;
    activePid?: number | null;
    slotType?: string | null;
  }): Promise<InstanceActionResponse>;
}
