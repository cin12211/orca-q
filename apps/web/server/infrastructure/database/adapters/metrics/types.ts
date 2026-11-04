import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseMetrics } from '~/core/types';
import type { BaseDatabaseAdapterParams } from '../shared';

export type DatabaseMetricsAdapterParams = BaseDatabaseAdapterParams;

export interface IDatabaseMetricsAdapter {
  readonly dbType: DatabaseClientType;
  getMetrics(): Promise<DatabaseMetrics>;
}
