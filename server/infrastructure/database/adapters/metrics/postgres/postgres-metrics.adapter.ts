import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseMetrics } from '~/core/types';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';
import { BaseDomainAdapter } from '../../shared';
import type {
  IDatabaseMetricsAdapter,
  DatabaseMetricsAdapterParams,
} from '../types';

const previousTxnCountByConnection = new Map<string, number>();

export class PostgresMetricsAdapter
  extends BaseDomainAdapter
  implements IDatabaseMetricsAdapter
{
  readonly dbType = DatabaseClientType.POSTGRES;
  private readonly cacheKey: string;

  constructor(adapter: IDatabaseAdapter, dbConnectionString: string) {
    super(adapter);
    this.cacheKey = dbConnectionString;
  }

  static async create(
    params: DatabaseMetricsAdapterParams
  ): Promise<PostgresMetricsAdapter> {
    const adapter = await PostgresMetricsAdapter.resolveAdapter(
      params,
      DatabaseClientType.POSTGRES
    );
    return new PostgresMetricsAdapter(adapter, params.dbConnectionString);
  }

  async getMetrics(): Promise<DatabaseMetrics> {
    // Get session count
    const sessionsRes = await this.adapter.rawQuery<{ count: string }>(
      'SELECT COUNT(*) FROM pg_stat_activity'
    );
    const sessionCount = parseInt(sessionsRes[0].count, 10);

    // Get total transactions
    const txnRes = await this.adapter.rawQuery<{ total_txn: string }>(`
      SELECT SUM(xact_commit + xact_rollback)::bigint AS total_txn FROM pg_stat_database;
    `);

    // In strict mode, handle potential null result from SUM
    const rawTxn = txnRes[0]?.total_txn || '0';
    const totalTxn = parseInt(rawTxn, 10);
    const previousTxnCount =
      previousTxnCountByConnection.get(this.cacheKey) ?? 0;
    const tps = previousTxnCount === 0 ? 0 : totalTxn - previousTxnCount;
    previousTxnCountByConnection.set(this.cacheKey, totalTxn);

    // Get block IO data
    const blockIO = await this.adapter.rawQuery<{
      blks_read: string;
      blks_hit: string;
    }>(`
      SELECT SUM(blks_read)::bigint AS blks_read, SUM(blks_hit)::bigint AS blks_hit FROM pg_stat_database;
    `);

    // In strict mode, handle potential null result from SUM
    const blksRead = blockIO[0]?.blks_read || '0';
    const blksHit = blockIO[0]?.blks_hit || '0';

    return {
      sessions: sessionCount,
      tps,
      block_io: {
        blks_read: parseInt(blksRead, 10),
        blks_hit: parseInt(blksHit, 10),
      },
    };
  }
}
