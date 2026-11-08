import { DatabaseClientType } from '#shared/constants/database-client-type';
import type { DatabaseMetrics } from '#shared/types';
import type { BaseDatabaseAdapterParams } from '../shared';

export type DatabaseMetricsAdapterParams = BaseDatabaseAdapterParams;

export interface IDatabaseMetricsAdapter {
  readonly dbType: DatabaseClientType;
  getMetrics(): Promise<DatabaseMetrics>;
}
