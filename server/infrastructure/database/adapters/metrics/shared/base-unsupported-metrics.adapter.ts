import { createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseMetrics } from '~/core/types';
import type { IDatabaseMetricsAdapter } from '../types';

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

export abstract class BaseUnsupportedMetricsAdapter
  implements IDatabaseMetricsAdapter
{
  abstract readonly dbType: DatabaseClientType;

  async getMetrics(): Promise<DatabaseMetrics> {
    throw createError({
      statusCode: 501,
      statusMessage: `${getDatabaseLabel(this.dbType)} metrics are not supported`,
      data: {
        dbType: this.dbType,
        feature: 'metrics',
      },
    });
  }
}
