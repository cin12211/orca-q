import { readBody, defineEventHandler } from 'h3';

let previousTxnCount = 0;

interface MetricsRequestBody {
  dbConnectionString: string;
}

interface MetricsResponse {
  sessions: number;
  tps: number;
  block_io: {
    blks_read: number;
    blks_hit: number;
  };
}

export default defineEventHandler(async (event): Promise<MetricsResponse> => {
  const body: MetricsRequestBody = await readBody(event);

  const resource = await getDatabaseSource({
    dbConnectionString: body.dbConnectionString,
    type: 'postgres',
  });

  // Get session count
  const sessionsRes = await resource.query(
    'SELECT COUNT(*) FROM pg_stat_activity'
  );
  console.log('🚀 ~ defineEventHandler ~ sessionsRes:', sessionsRes);

  const sessionCount = parseInt(sessionsRes[0].count);

  // Get total transactions
  const txnRes = await resource.query(`
    SELECT SUM(xact_commit + xact_rollback)::bigint AS total_txn FROM pg_stat_database;
  `);
  const totalTxn = parseInt(txnRes[0].total_txn);
  const tps = previousTxnCount === 0 ? 0 : totalTxn - previousTxnCount;
  previousTxnCount = totalTxn;

  // Get block IO data
  const blockIO = await resource.query(`
    SELECT SUM(blks_read)::bigint AS blks_read, SUM(blks_hit)::bigint AS blks_hit FROM pg_stat_database;
  `);

  return {
    sessions: sessionCount,
    tps,
    block_io: {
      blks_read: parseInt(blockIO[0].blks_read),
      blks_hit: parseInt(blockIO[0].blks_hit),
    },
  };
});
