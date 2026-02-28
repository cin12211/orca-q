import type { DatabaseMetrics } from '~/core/types';
import type {
  BaseDatabaseAdapterParams,
  SupportedDatabaseType,
} from '../shared';

export type DatabaseMetricsAdapterParams = BaseDatabaseAdapterParams;

export interface IDatabaseMetricsAdapter {
  readonly dbType: SupportedDatabaseType;
  getMetrics(): Promise<DatabaseMetrics>;
}
