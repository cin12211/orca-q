import { createError } from 'h3';
import type {
  InstanceActionResponse,
  InstanceConfigurationRow,
  InstanceInsightsConfiguration,
  InstanceInsightsDashboard,
  InstanceInsightsReplication,
  InstanceInsightsState,
  InstanceLockRow,
  InstancePreparedTransactionRow,
  InstanceSessionRow,
  ReplicationSlotRow,
  ReplicationStatRow,
} from '~/core/types';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';
import {
  BaseDomainAdapter,
  SupportedDatabaseType,
  toDatabaseHttpError,
} from '../../shared';
import type {
  IDatabaseInstanceInsightsAdapter,
  InstanceInsightsAdapterParams,
  InstanceInsightsConfigurationOptions,
} from '../types';

interface MetricsSnapshot {
  capturedAt: number;
  commits: number;
  rollbacks: number;
  inserts: number;
  updates: number;
  deletes: number;
  fetched: number;
  returned: number;
  blksRead: number;
  blksHit: number;
}

const previousSnapshotByConnection = new Map<string, MetricsSnapshot>();
const STALE_SLOT_RETENTION_BYTES = 1024 * 1024 * 1024;
const SESSION_ALERT_THRESHOLD_PERCENT = 80;

export class PostgresInstanceInsightsAdapter
  extends BaseDomainAdapter
  implements IDatabaseInstanceInsightsAdapter
{
  readonly dbType = SupportedDatabaseType.POSTGRES;
  private readonly cacheKey: string;

  constructor(params: { cacheKey: string; adapter: IDatabaseAdapter }) {
    super(params.adapter);
    this.cacheKey = params.cacheKey;
  }

  static async create(
    params: InstanceInsightsAdapterParams
  ): Promise<PostgresInstanceInsightsAdapter> {
    const adapter = await PostgresInstanceInsightsAdapter.resolveAdapter(
      params,
      SupportedDatabaseType.POSTGRES
    );

    return new PostgresInstanceInsightsAdapter({
      adapter,
      cacheKey: params.dbConnectionString,
    });
  }

  async getDashboard(): Promise<InstanceInsightsDashboard> {
    const sessionsResult = await this.adapter.rawQuery<{
      total: string;
      active: string;
      idle: string;
    }>(`
      SELECT
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE state = 'active')::bigint AS active,
        COUNT(*) FILTER (WHERE state = 'idle')::bigint AS idle
      FROM pg_stat_activity
    `);

    const maxConnectionsResult = await this.adapter.rawQuery<{
      max_connections: string;
    }>('SHOW max_connections');

    const countersResult = await this.adapter.rawQuery<{
      commits: string;
      rollbacks: string;
      inserts: string;
      updates: string;
      deletes: string;
      fetched: string;
      returned: string;
      blks_read: string;
      blks_hit: string;
    }>(`
      SELECT
        COALESCE(xact_commit, 0)::bigint AS commits,
        COALESCE(xact_rollback, 0)::bigint AS rollbacks,
        COALESCE(tup_inserted, 0)::bigint AS inserts,
        COALESCE(tup_updated, 0)::bigint AS updates,
        COALESCE(tup_deleted, 0)::bigint AS deletes,
        COALESCE(tup_fetched, 0)::bigint AS fetched,
        COALESCE(tup_returned, 0)::bigint AS returned,
        COALESCE(blks_read, 0)::bigint AS blks_read,
        COALESCE(blks_hit, 0)::bigint AS blks_hit
      FROM pg_stat_database
      WHERE datname = current_database()
    `);

    const nowMs = Date.now();
    const previousSnapshot = previousSnapshotByConnection.get(this.cacheKey);
    const intervalSeconds = previousSnapshot
      ? Math.max((nowMs - previousSnapshot.capturedAt) / 1000, 1)
      : 1;

    const counters = countersResult[0];
    const commits = this.toNumber(counters?.commits);
    const rollbacks = this.toNumber(counters?.rollbacks);
    const inserts = this.toNumber(counters?.inserts);
    const updates = this.toNumber(counters?.updates);
    const deletes = this.toNumber(counters?.deletes);
    const fetched = this.toNumber(counters?.fetched);
    const returned = this.toNumber(counters?.returned);
    const blksRead = this.toNumber(counters?.blks_read);
    const blksHit = this.toNumber(counters?.blks_hit);

    const commitsPerSec = this.getRatePerSecond(
      commits,
      previousSnapshot?.commits,
      intervalSeconds
    );
    const rollbacksPerSec = this.getRatePerSecond(
      rollbacks,
      previousSnapshot?.rollbacks,
      intervalSeconds
    );

    const insertsPerSec = this.getRatePerSecond(
      inserts,
      previousSnapshot?.inserts,
      intervalSeconds
    );
    const updatesPerSec = this.getRatePerSecond(
      updates,
      previousSnapshot?.updates,
      intervalSeconds
    );
    const deletesPerSec = this.getRatePerSecond(
      deletes,
      previousSnapshot?.deletes,
      intervalSeconds
    );
    const fetchedPerSec = this.getRatePerSecond(
      fetched,
      previousSnapshot?.fetched,
      intervalSeconds
    );
    const returnedPerSec = this.getRatePerSecond(
      returned,
      previousSnapshot?.returned,
      intervalSeconds
    );
    const readsPerSec = this.getRatePerSecond(
      blksRead,
      previousSnapshot?.blksRead,
      intervalSeconds
    );
    const hitsPerSec = this.getRatePerSecond(
      blksHit,
      previousSnapshot?.blksHit,
      intervalSeconds
    );

    previousSnapshotByConnection.set(this.cacheKey, {
      capturedAt: nowMs,
      commits,
      rollbacks,
      inserts,
      updates,
      deletes,
      fetched,
      returned,
      blksRead,
      blksHit,
    });

    const sessions = sessionsResult[0];
    const totalSessions = this.toNumber(sessions?.total);
    const maxConnections = this.toNumber(
      maxConnectionsResult[0]?.max_connections
    );
    const usagePercent =
      maxConnections > 0 ? (totalSessions / maxConnections) * 100 : 0;

    const totalBlocks = blksRead + blksHit;
    const bufferHitRatio =
      totalBlocks > 0 ? (blksHit / totalBlocks) * 100 : 100;

    return {
      capturedAt: new Date(nowMs).toISOString(),
      intervalSeconds,
      sessions: {
        total: totalSessions,
        active: this.toNumber(sessions?.active),
        idle: this.toNumber(sessions?.idle),
        maxConnections,
        usagePercent: this.round(usagePercent, 2),
        exceedsThreshold: usagePercent >= SESSION_ALERT_THRESHOLD_PERCENT,
      },
      transactions: {
        tps: this.round(commitsPerSec + rollbacksPerSec, 2),
        commitsPerSec: this.round(commitsPerSec, 2),
        rollbacksPerSec: this.round(rollbacksPerSec, 2),
        totalCommits: commits,
        totalRollbacks: rollbacks,
      },
      tuples: {
        insertsPerSec: this.round(insertsPerSec, 2),
        updatesPerSec: this.round(updatesPerSec, 2),
        deletesPerSec: this.round(deletesPerSec, 2),
        fetchedPerSec: this.round(fetchedPerSec, 2),
        returnedPerSec: this.round(returnedPerSec, 2),
        totalInserts: inserts,
        totalUpdates: updates,
        totalDeletes: deletes,
        totalFetched: fetched,
        totalReturned: returned,
      },
      blockIO: {
        readsPerSec: this.round(readsPerSec, 2),
        hitsPerSec: this.round(hitsPerSec, 2),
        totalReads: blksRead,
        totalHits: blksHit,
        bufferHitRatio: this.round(bufferHitRatio, 2),
      },
    };
  }

  async getState(): Promise<InstanceInsightsState> {
    const sessionsResult = await this.adapter.rawQuery<{
      pid: number;
      user: string;
      application: string | null;
      client: string | null;
      backend_start: string | null;
      transaction_start: string | null;
      state: string | null;
      wait_event: string | null;
      blocking_pids: number[] | null;
      sql: string | null;
      query_start: string | null;
      duration_seconds: string | null;
    }>(`
      SELECT
        a.pid,
        a.usename AS "user",
        NULLIF(a.application_name, '') AS application,
        COALESCE(a.client_addr::text, a.client_hostname, 'local') AS client,
        a.backend_start::text AS backend_start,
        a.xact_start::text AS transaction_start,
        a.state,
        CASE
          WHEN a.wait_event_type IS NOT NULL AND a.wait_event IS NOT NULL THEN a.wait_event_type || ': ' || a.wait_event
          WHEN a.wait_event IS NOT NULL THEN a.wait_event
          ELSE NULL
        END AS wait_event,
        pg_blocking_pids(a.pid) AS blocking_pids,
        a.query AS sql,
        a.query_start::text AS query_start,
        EXTRACT(EPOCH FROM (clock_timestamp() - COALESCE(a.query_start, a.state_change)))::bigint::text AS duration_seconds
      FROM pg_stat_activity a
      WHERE a.pid <> pg_backend_pid()
      ORDER BY
        CASE a.state
          WHEN 'active' THEN 1
          WHEN 'idle in transaction' THEN 2
          WHEN 'idle in transaction (aborted)' THEN 3
          ELSE 4
        END,
        a.query_start DESC NULLS LAST,
        a.backend_start DESC
    `);

    const locksResult = await this.safeRawQuery<{
      pid: number | null;
      lock_type: string;
      target_relation: string | null;
      mode: string;
      granted: boolean;
      state: string | null;
      user: string | null;
      sql: string | null;
    }>(`
      SELECT
        l.pid,
        l.locktype AS lock_type,
        CASE
          WHEN l.relation IS NOT NULL THEN COALESCE(n.nspname || '.', '') || c.relname
          ELSE NULL
        END AS target_relation,
        l.mode,
        l.granted,
        a.state,
        a.usename AS "user",
        a.query AS sql
      FROM pg_locks l
      LEFT JOIN pg_class c ON c.oid = l.relation
      LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_stat_activity a ON a.pid = l.pid
      WHERE l.database IS NULL
         OR l.database = (SELECT oid FROM pg_database WHERE datname = current_database())
      ORDER BY l.granted ASC, l.pid NULLS LAST, l.locktype
    `);

    const preparedResult = await this.safeRawQuery<{
      transaction: string;
      gid: string;
      prepared: string;
      owner: string;
      database: string;
    }>(`
      SELECT
        transaction::text AS transaction,
        gid,
        prepared::text AS prepared,
        owner,
        database
      FROM pg_prepared_xacts
      ORDER BY prepared DESC
    `);

    const sessions: InstanceSessionRow[] = sessionsResult.map(row => ({
      pid: this.toNumber(row.pid),
      user: row.user || '',
      application: row.application || null,
      client: row.client || null,
      backendStart: row.backend_start || null,
      transactionStart: row.transaction_start || null,
      state: row.state || null,
      waitEvent: row.wait_event || null,
      blockingPids: this.toPidArray(row.blocking_pids),
      sql: row.sql || null,
      queryStart: row.query_start || null,
      durationSeconds: row.duration_seconds
        ? this.toNumber(row.duration_seconds)
        : null,
    }));

    const locks: InstanceLockRow[] = locksResult.map(row => ({
      pid: row.pid !== null ? this.toNumber(row.pid) : null,
      lockType: row.lock_type,
      targetRelation: row.target_relation || null,
      mode: row.mode,
      granted: Boolean(row.granted),
      state: row.state || null,
      user: row.user || null,
      sql: row.sql || null,
    }));

    const preparedTransactions: InstancePreparedTransactionRow[] =
      preparedResult.map(row => ({
        transaction: row.transaction,
        gid: row.gid,
        prepared: row.prepared,
        owner: row.owner,
        database: row.database,
      }));

    return {
      capturedAt: new Date().toISOString(),
      sessions,
      locks,
      preparedTransactions,
    };
  }

  async getConfiguration(
    options: InstanceInsightsConfigurationOptions = {}
  ): Promise<InstanceInsightsConfiguration> {
    const requestedLimit =
      typeof options.limit === 'number' && Number.isFinite(options.limit)
        ? Math.max(1, Math.round(options.limit))
        : null;
    const limit = requestedLimit ? Math.min(requestedLimit, 10000) : null;
    const search = options.search?.trim();

    const selectColumns = `
      SELECT
        name,
        category,
        setting AS value,
        NULLIF(unit, '') AS unit,
        short_desc AS description,
        pending_restart
      FROM pg_settings
    `;

    let rows: InstanceConfigurationRow[] = [];
    let total = 0;

    if (search) {
      const like = `%${search}%`;
      const params: Array<string | number> = [like, like, like];

      if (limit) {
        params.push(limit);
      }

      const result = await this.adapter.rawQuery<{
        name: string;
        category: string;
        value: string;
        unit: string | null;
        description: string;
        pending_restart: boolean;
      }>(
        `
          ${selectColumns}
          WHERE name ILIKE ?
             OR category ILIKE ?
             OR short_desc ILIKE ?
          ORDER BY name
          ${limit ? 'LIMIT ?' : ''}
        `,
        params
      );

      const totalResult = await this.adapter.rawQuery<{ total: string }>(
        `
          SELECT COUNT(*)::bigint AS total
          FROM pg_settings
          WHERE name ILIKE ?
             OR category ILIKE ?
             OR short_desc ILIKE ?
        `,
        [like, like, like]
      );

      rows = result.map(row => this.mapConfigurationRow(row));
      total = this.toNumber(totalResult[0]?.total);
    } else {
      const params: number[] = [];
      if (limit) {
        params.push(limit);
      }

      const result = await this.adapter.rawQuery<{
        name: string;
        category: string;
        value: string;
        unit: string | null;
        description: string;
        pending_restart: boolean;
      }>(
        `
          ${selectColumns}
          ORDER BY name
          ${limit ? 'LIMIT ?' : ''}
        `,
        params
      );

      const totalResult = await this.adapter.rawQuery<{ total: string }>(
        'SELECT COUNT(*)::bigint AS total FROM pg_settings'
      );

      rows = result.map(row => this.mapConfigurationRow(row));
      total = this.toNumber(totalResult[0]?.total);
    }

    return {
      capturedAt: new Date().toISOString(),
      total,
      rows,
    };
  }

  async getReplication(): Promise<InstanceInsightsReplication> {
    const recoveryResult = await this.safeRawQuery<{ is_recovery: boolean }>(
      'SELECT pg_is_in_recovery() AS is_recovery'
    );
    const isRecovery = Boolean(recoveryResult[0]?.is_recovery);
    const lsnReferenceSql = isRecovery
      ? 'pg_last_wal_receive_lsn()'
      : 'pg_current_wal_lsn()';

    const replicationStatsResult = await this.safeRawQuery<{
      pid: number;
      client_addr: string | null;
      application_name: string | null;
      state: string | null;
      sync_state: string | null;
      reply_time: string | null;
      write_lag: string | null;
      flush_lag: string | null;
      replay_lag: string | null;
      sent_lsn: string | null;
      write_lsn: string | null;
      flush_lsn: string | null;
      replay_lsn: string | null;
    }>(`
      SELECT
        pid,
        COALESCE(client_addr::text, client_hostname, 'local') AS client_addr,
        NULLIF(application_name, '') AS application_name,
        state,
        sync_state,
        reply_time::text AS reply_time,
        write_lag::text,
        flush_lag::text,
        replay_lag::text,
        sent_lsn::text,
        write_lsn::text,
        flush_lsn::text,
        replay_lsn::text
      FROM pg_stat_replication
      ORDER BY application_name NULLS LAST, pid
    `);

    const replicationSlotsResult = await this.safeRawQuery<{
      slot_name: string;
      slot_type: string;
      active: boolean;
      active_pid: number | null;
      restart_lsn: string | null;
      confirmed_flush_lsn: string | null;
      retained_bytes: string;
      temporary: boolean;
    }>(`
      SELECT
        slot_name,
        slot_type,
        active,
        active_pid,
        restart_lsn::text,
        confirmed_flush_lsn::text,
        COALESCE(
          CASE
            WHEN restart_lsn IS NULL THEN 0
            ELSE pg_wal_lsn_diff(${lsnReferenceSql}, restart_lsn)
          END,
          0
        )::bigint::text AS retained_bytes,
        temporary
      FROM pg_replication_slots
      ORDER BY active DESC, slot_name
    `);

    const replicationStats: ReplicationStatRow[] = replicationStatsResult.map(
      row => ({
        pid: this.toNumber(row.pid),
        clientAddr: row.client_addr || null,
        applicationName: row.application_name || null,
        state: row.state || null,
        syncState: row.sync_state || null,
        replyTime: row.reply_time || null,
        writeLag: row.write_lag || null,
        flushLag: row.flush_lag || null,
        replayLag: row.replay_lag || null,
        sentLsn: row.sent_lsn || null,
        writeLsn: row.write_lsn || null,
        flushLsn: row.flush_lsn || null,
        replayLsn: row.replay_lsn || null,
      })
    );

    const replicationSlots: ReplicationSlotRow[] = replicationSlotsResult.map(
      row => ({
        slotName: row.slot_name,
        slotType: row.slot_type,
        active: Boolean(row.active),
        activePid:
          row.active_pid !== null ? this.toNumber(row.active_pid) : null,
        restartLsn: row.restart_lsn || null,
        confirmedFlushLsn: row.confirmed_flush_lsn || null,
        retainedBytes: this.toNumber(row.retained_bytes),
        temporary: Boolean(row.temporary),
      })
    );

    const staleSlots = replicationSlots.filter(
      slot => !slot.active && slot.retainedBytes >= STALE_SLOT_RETENTION_BYTES
    );

    const staleSlotWarning =
      staleSlots.length > 0
        ? `Detected ${staleSlots.length} inactive replication slot(s) retaining >= 1GB WAL. Consider dropping stale slots to avoid disk pressure.`
        : null;

    return {
      capturedAt: new Date().toISOString(),
      replicationStats,
      replicationSlots,
      staleSlotWarning,
    };
  }

  async cancelQuery(pid: number): Promise<InstanceActionResponse> {
    this.ensureValidPid(pid);
    await this.ensureNotCurrentBackendPid(pid);

    try {
      const result = await this.adapter.rawQuery<{ cancelled: boolean }>(
        'SELECT pg_cancel_backend(?::int) AS cancelled',
        [pid]
      );

      const success = Boolean(result[0]?.cancelled);
      return {
        success,
        message: success
          ? `Cancelled query for PID ${pid}.`
          : `Could not cancel query for PID ${pid}.`,
      };
    } catch (error) {
      throw toDatabaseHttpError(error);
    }
  }

  async terminateConnection(pid: number): Promise<InstanceActionResponse> {
    this.ensureValidPid(pid);
    await this.ensureNotCurrentBackendPid(pid);

    try {
      const result = await this.adapter.rawQuery<{ terminated: boolean }>(
        'SELECT pg_terminate_backend(?::int) AS terminated',
        [pid]
      );

      const success = Boolean(result[0]?.terminated);
      return {
        success,
        message: success
          ? `Terminated connection for PID ${pid}.`
          : `Could not terminate connection for PID ${pid}.`,
      };
    } catch (error) {
      throw toDatabaseHttpError(error);
    }
  }

  async dropReplicationSlot(slotName: string): Promise<InstanceActionResponse> {
    const normalized = slotName.trim();
    if (!normalized) {
      throw createError({
        statusCode: 400,
        statusMessage: 'slotName is required',
      });
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(normalized)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'slotName contains invalid characters',
      });
    }

    try {
      await this.adapter.rawQuery('SELECT pg_drop_replication_slot(?::text)', [
        normalized,
      ]);

      return {
        success: true,
        message: `Dropped replication slot "${normalized}".`,
      };
    } catch (error) {
      throw toDatabaseHttpError(error);
    }
  }

  async toggleReplicationSlotStatus(params: {
    slotName: string;
    desiredStatus: 'on' | 'off';
    activePid?: number | null;
    slotType?: string | null;
  }): Promise<InstanceActionResponse> {
    const slotName = params.slotName.trim();
    if (!slotName) {
      throw createError({
        statusCode: 400,
        statusMessage: 'slotName is required',
      });
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(slotName)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'slotName contains invalid characters',
      });
    }

    const desiredStatus = params.desiredStatus;
    if (desiredStatus !== 'on' && desiredStatus !== 'off') {
      throw createError({
        statusCode: 400,
        statusMessage: 'desiredStatus must be either "on" or "off"',
      });
    }

    if (desiredStatus === 'off') {
      const activePid = this.toNumber(params.activePid);
      if (activePid <= 0) {
        return {
          success: true,
          message: `Replication slot "${slotName}" is already off.`,
        };
      }

      await this.ensureNotCurrentBackendPid(activePid);
      const terminated = await this.adapter.rawQuery<{ terminated: boolean }>(
        'SELECT pg_terminate_backend(?::int) AS terminated',
        [activePid]
      );

      if (!terminated[0]?.terminated) {
        return {
          success: false,
          message: `Could not turn off replication slot "${slotName}".`,
        };
      }

      return {
        success: true,
        message: `Turned off replication slot "${slotName}" by terminating PID ${activePid}.`,
      };
    }

    const slotType = (params.slotType || '').toLowerCase();
    if (slotType !== 'logical') {
      return {
        success: false,
        message:
          'Turn on is only supported for logical slots from SQL context. Physical slots require a replica client to connect.',
      };
    }

    try {
      await this.adapter.rawQuery(
        'SELECT 1 FROM pg_logical_slot_peek_changes(?::text, NULL, 1)',
        [slotName]
      );

      return {
        success: true,
        message: `Turned on logical slot "${slotName}" using a probe reader.`,
      };
    } catch (error) {
      throw toDatabaseHttpError(error);
    }
  }

  private mapConfigurationRow(row: {
    name: string;
    category: string;
    value: string;
    unit: string | null;
    description: string;
    pending_restart: boolean;
  }): InstanceConfigurationRow {
    return {
      name: row.name,
      category: row.category,
      value: row.value,
      unit: row.unit || null,
      description: row.description || '',
      pendingRestart: Boolean(row.pending_restart),
    };
  }

  private getRatePerSecond(
    current: number,
    previous: number | undefined,
    intervalSeconds: number
  ) {
    if (previous === undefined) return 0;
    const delta = current - previous;
    return Math.max(delta, 0) / Math.max(intervalSeconds, 1);
  }

  private async safeRawQuery<T>(
    sql: string,
    bindings: any[] = []
  ): Promise<T[]> {
    try {
      return await this.adapter.rawQuery<T>(sql, bindings);
    } catch (error) {
      console.warn(
        '[PostgresInstanceInsightsAdapter] Non-fatal query error',
        error
      );
      return [];
    }
  }

  private async ensureNotCurrentBackendPid(pid: number) {
    const result = await this.adapter.rawQuery<{ pid: string }>(
      'SELECT pg_backend_pid()::text AS pid'
    );
    const currentPid = this.toNumber(result[0]?.pid);
    if (currentPid === pid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Refusing to execute action on current backend PID',
      });
    }
  }

  private ensureValidPid(pid: number) {
    if (!Number.isInteger(pid) || pid <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'pid must be a positive integer',
      });
    }
  }

  private toPidArray(value: unknown): number[] {
    if (Array.isArray(value)) {
      return value
        .map(item => this.toNumber(item))
        .filter(item => Number.isInteger(item) && item > 0);
    }

    if (typeof value === 'string') {
      const normalized = value.replace(/[{}]/g, '').trim();
      if (!normalized) return [];
      return normalized
        .split(',')
        .map(item => this.toNumber(item.trim()))
        .filter(item => Number.isInteger(item) && item > 0);
    }

    return [];
  }

  private toNumber(value: unknown): number {
    const parsed =
      typeof value === 'number' ? value : Number.parseFloat(String(value ?? 0));

    return Number.isFinite(parsed) ? parsed : 0;
  }

  private round(value: number, digits: number) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }
}
