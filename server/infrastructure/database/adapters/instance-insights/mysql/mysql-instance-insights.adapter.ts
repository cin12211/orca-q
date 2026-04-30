import { createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  InstanceActionResponse,
  InstanceInsightsSection,
  InstanceInsightsView,
} from '~/core/types';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';
import { getDatabaseSource } from '~/server/infrastructure/driver/db-connection';
import { createDatabaseHttpError } from '../../shared';
import { BaseUnsupportedInstanceInsightsAdapter } from '../shared/base-unsupported-instance-insights.adapter';
import {
  createActionCapability,
  createInsightsCapabilities,
  createTable,
  createUnavailableSection,
  formatBoolean,
  formatBytes,
  formatDurationSeconds,
  formatNumber,
  formatPercent,
  formatValue,
} from '../shared/view-helpers';
import type { InstanceInsightsAdapterParams } from '../types';

type QueryOutcome<T> = {
  rows: T[];
  error: string | null;
};

const IMPORTANT_VARIABLES = [
  'max_connections',
  'wait_timeout',
  'interactive_timeout',
  'innodb_buffer_pool_size',
  'tmp_table_size',
  'max_heap_table_size',
  'sql_mode',
  'read_only',
  'super_read_only',
  'performance_schema',
] as const;

export class MysqlInstanceInsightsAdapter extends BaseUnsupportedInstanceInsightsAdapter {
  readonly dbType: DatabaseClientType;

  private readonly adapter: IDatabaseAdapter;

  private constructor(params: {
    dbType: DatabaseClientType;
    adapter: IDatabaseAdapter;
  }) {
    super();
    this.dbType = params.dbType;
    this.adapter = params.adapter;
  }

  static async create(
    params: InstanceInsightsAdapterParams,
    dbType: DatabaseClientType = DatabaseClientType.MYSQL
  ): Promise<MysqlInstanceInsightsAdapter> {
    const adapter = await getDatabaseSource({
      ...params,
      type: dbType,
    });

    return new MysqlInstanceInsightsAdapter({
      dbType,
      adapter,
    });
  }

  override async getView(): Promise<InstanceInsightsView> {
    const capturedAt = new Date().toISOString();
    const versionResult = await this.tryRawQuery<{ version: string }>(
      'SELECT VERSION() AS version'
    );
    const version = versionResult.rows[0]
      ? String(this.pick(versionResult.rows[0], 'version') ?? '')
      : null;

    const [overview, sessions, configuration, replication] = await Promise.all([
      this.buildOverviewSection(capturedAt, version),
      this.buildSessionsSection(capturedAt),
      this.buildConfigurationSection(capturedAt),
      this.buildReplicationSection(capturedAt),
    ]);

    const sessionActions = [
      createActionCapability({
        id: 'kill-query',
        label: 'Kill Query',
        state: 'supported',
        description: `Cancel the active ${this.databaseLabel} query for a selected session.`,
      }),
      createActionCapability({
        id: 'kill-connection',
        label: 'Kill Connection',
        state: 'supported',
        description: `Terminate a selected ${this.databaseLabel} session.`,
      }),
    ];

    const replicationActions = [
      createActionCapability({
        id: 'replication-actions',
        label: 'Replication Actions',
        state: 'unsupported',
        description: 'Replication control actions are not exposed in phase 1.',
      }),
    ];

    return {
      dbType: this.dbType,
      title: 'Instance Insights',
      databaseName: null,
      version,
      capturedAt,
      capabilities: createInsightsCapabilities({
        supportsSessionInspection: true,
        supportsLockInspection: true,
        supportsConfiguration: true,
        supportsReplication: true,
        supportsCancelQuery: true,
        supportsTerminateConnection: true,
      }),
      actions: [...sessionActions, ...replicationActions],
      sections: [
        overview,
        {
          ...sessions,
          actions: sessionActions,
        },
        configuration,
        {
          ...replication,
          actions: replicationActions,
        },
      ],
    };
  }

  override async cancelQuery(pid: number): Promise<InstanceActionResponse> {
    this.ensurePositiveInteger(pid, 'pid');

    try {
      await this.adapter.rawQuery(`KILL QUERY ${pid}`);
      return {
        success: true,
        message: `Killed query for session ${pid}.`,
      };
    } catch (error) {
      throw createDatabaseHttpError(this.dbType, error);
    }
  }

  override async terminateConnection(
    pid: number
  ): Promise<InstanceActionResponse> {
    this.ensurePositiveInteger(pid, 'pid');

    try {
      await this.adapter.rawQuery(`KILL CONNECTION ${pid}`);
      return {
        success: true,
        message: `Terminated connection ${pid}.`,
      };
    } catch (error) {
      throw createDatabaseHttpError(this.dbType, error);
    }
  }

  private async buildOverviewSection(
    capturedAt: string,
    version: string | null
  ): Promise<InstanceInsightsSection> {
    try {
      const [statusRows, variableRows] = await Promise.all([
        this.adapter.rawQuery<Record<string, unknown>>('SHOW GLOBAL STATUS'),
        this.adapter.rawQuery<Record<string, unknown>>('SHOW GLOBAL VARIABLES'),
      ]);

      const statusMap = this.toKeyValueMap(statusRows);
      const variableMap = this.toKeyValueMap(variableRows);
      const createdTmpTables = this.toNumber(statusMap.created_tmp_tables);
      const createdTmpDiskTables = this.toNumber(
        statusMap.created_tmp_disk_tables
      );
      const rollbackCount = this.toNumber(statusMap.com_rollback);
      const commitCount = this.toNumber(statusMap.com_commit);
      const bufferReadRequests = this.toNumber(
        statusMap.innodb_buffer_pool_read_requests
      );
      const bufferReads = this.toNumber(statusMap.innodb_buffer_pool_reads);

      const tempDiskRatio =
        createdTmpTables > 0
          ? (createdTmpDiskTables / createdTmpTables) * 100
          : 0;
      const rollbackRatio =
        commitCount + rollbackCount > 0
          ? (rollbackCount / (commitCount + rollbackCount)) * 100
          : 0;
      const bufferHitRatio =
        bufferReadRequests > 0
          ? ((bufferReadRequests - bufferReads) / bufferReadRequests) * 100
          : 100;

      return {
        id: 'overview',
        title: 'Overview',
        subtitle: `${this.databaseLabel} health and workload snapshot`,
        status: 'ready',
        capturedAt,
        cards: [
          {
            id: 'version',
            label: 'Version',
            value: version || '-',
          },
          {
            id: 'uptime',
            label: 'Uptime',
            value: formatDurationSeconds(statusMap.uptime),
          },
          {
            id: 'threads-connected',
            label: 'Threads Connected',
            value: formatNumber(statusMap.threads_connected),
            helperText: `Running ${formatNumber(statusMap.threads_running)}`,
          },
          {
            id: 'questions',
            label: 'Questions',
            value: formatNumber(statusMap.questions),
            helperText: `Connections ${formatNumber(statusMap.connections)}`,
          },
          {
            id: 'slow-queries',
            label: 'Slow Queries',
            value: formatNumber(statusMap.slow_queries),
            helperText: `Aborted connects ${formatNumber(statusMap.aborted_connects)}`,
            tone:
              this.toNumber(statusMap.slow_queries) > 0 ? 'warning' : 'default',
          },
          {
            id: 'temp-disk-ratio',
            label: 'Temp Disk Ratio',
            value: formatPercent(tempDiskRatio, 2),
            helperText: `Tmp tables ${formatNumber(createdTmpDiskTables)} on disk`,
            tone: tempDiskRatio > 20 ? 'warning' : 'default',
          },
          {
            id: 'buffer-hit-ratio',
            label: 'InnoDB Buffer Hit Ratio',
            value: formatPercent(bufferHitRatio, 2),
            helperText: `Read requests ${formatNumber(bufferReadRequests)}`,
          },
          {
            id: 'rollback-ratio',
            label: 'Rollback Ratio',
            value: formatPercent(rollbackRatio, 2),
            helperText: `Commits ${formatNumber(commitCount)} · Rollbacks ${formatNumber(rollbackCount)}`,
          },
        ],
        details: [
          {
            label: 'Bytes Received',
            value: formatBytes(statusMap.bytes_received),
          },
          {
            label: 'Bytes Sent',
            value: formatBytes(statusMap.bytes_sent),
          },
          {
            label: 'Read Only',
            value: formatBoolean(variableMap.read_only),
          },
          {
            label: 'Performance Schema',
            value: formatBoolean(variableMap.performance_schema),
            tone:
              formatBoolean(variableMap.performance_schema) === 'No'
                ? 'warning'
                : 'default',
          },
          {
            label: 'Version Comment',
            value: formatValue(variableMap.version_comment),
          },
        ],
      };
    } catch (error) {
      return createUnavailableSection(
        'overview',
        'Overview',
        `${this.databaseLabel} health and workload snapshot`,
        this.getErrorMessage(error),
        capturedAt
      );
    }
  }

  private async buildSessionsSection(
    capturedAt: string
  ): Promise<InstanceInsightsSection> {
    const processList = await this.tryRawQuery<Record<string, unknown>>(
      'SHOW FULL PROCESSLIST'
    );

    if (processList.error) {
      return createUnavailableSection(
        'sessions-locks',
        'Sessions & Locks',
        'Current sessions, waits, and lock pressure',
        processList.error,
        capturedAt
      );
    }

    const notes: string[] = [];
    const tables = [
      createTable({
        id: `${this.dbType}-sessions`,
        title: 'Sessions',
        emptyMessage: 'No sessions were returned.',
        rows: processList.rows.map(row => ({
          session_id: this.pick(row, 'Id', 'id'),
          user: this.pick(row, 'User', 'user'),
          host: this.pick(row, 'Host', 'host'),
          database: this.pick(row, 'db', 'DB'),
          command: this.pick(row, 'Command', 'command'),
          state: this.pick(row, 'State', 'state'),
          duration_seconds: this.pick(row, 'Time', 'time'),
          sql_text: this.pick(row, 'Info', 'info'),
        })),
      }),
    ];

    const lockWaits = await this.getLockWaitRows();
    if (lockWaits.error) {
      notes.push(lockWaits.error);
    }

    tables.push(
      createTable({
        id: `${this.dbType}-lock-waits`,
        title: 'Lock Waits',
        emptyMessage: 'No lock waits are currently visible.',
        rows: lockWaits.rows,
      })
    );

    const metadataLocks = await this.getMetadataLockRows();
    if (metadataLocks.error) {
      notes.push(metadataLocks.error);
    }

    tables.push(
      createTable({
        id: `${this.dbType}-metadata-locks`,
        title: 'Metadata Locks',
        emptyMessage:
          this.dbType === DatabaseClientType.MARIADB
            ? 'Metadata lock info is unavailable unless the plugin is installed.'
            : 'Metadata lock details are unavailable unless instrumentation is enabled.',
        rows: metadataLocks.rows,
      })
    );

    return {
      id: 'sessions-locks',
      title: 'Sessions & Locks',
      subtitle: 'Current sessions, waits, and lock pressure',
      status: 'ready',
      capturedAt,
      statusMessage: notes.length ? notes.join(' ') : null,
      cards: [
        {
          id: 'sessions-visible',
          label: 'Visible Sessions',
          value: formatNumber(processList.rows.length),
        },
        {
          id: 'lock-waits',
          label: 'Lock Wait Rows',
          value: formatNumber(lockWaits.rows.length),
        },
        {
          id: 'metadata-locks',
          label: 'Metadata Lock Rows',
          value: formatNumber(metadataLocks.rows.length),
          tone: metadataLocks.error ? 'warning' : 'default',
        },
      ],
      tables,
    };
  }

  private async buildConfigurationSection(
    capturedAt: string
  ): Promise<InstanceInsightsSection> {
    const variablesResult = await this.tryRawQuery<Record<string, unknown>>(
      'SHOW GLOBAL VARIABLES'
    );

    if (variablesResult.error) {
      return createUnavailableSection(
        'configuration',
        'Configuration',
        `${this.databaseLabel} system variables`,
        variablesResult.error,
        capturedAt
      );
    }

    const importantNames = new Set<string>(IMPORTANT_VARIABLES);
    const variableRows = variablesResult.rows
      .map(row => {
        const name = String(
          this.pick(row, 'Variable_name', 'VARIABLE_NAME', 'variable_name') ||
            ''
        );
        const value = this.pick(row, 'Value', 'VALUE', 'value');

        return {
          name,
          category: importantNames.has(name) ? 'Important' : 'General',
          value,
        };
      })
      .sort((left, right) => {
        if (left.category !== right.category) {
          return left.category === 'Important' ? -1 : 1;
        }

        return left.name.localeCompare(right.name);
      });

    const variableMap = this.toKeyValueMap(variablesResult.rows);

    return {
      id: 'configuration',
      title: 'Configuration',
      subtitle: `${this.databaseLabel} system variables`,
      status: 'ready',
      capturedAt,
      searchable: true,
      searchPlaceholder: 'Search variable name or value...',
      cards: [
        {
          id: 'variables-total',
          label: 'Variables',
          value: formatNumber(variableRows.length),
        },
        {
          id: 'max-connections',
          label: 'Max Connections',
          value: formatNumber(variableMap.max_connections),
        },
        {
          id: 'read-only',
          label: 'Read Only',
          value: formatBoolean(variableMap.read_only),
        },
        {
          id: 'performance-schema',
          label: 'Performance Schema',
          value: formatBoolean(variableMap.performance_schema),
          tone:
            formatBoolean(variableMap.performance_schema) === 'No'
              ? 'warning'
              : 'default',
        },
      ],
      tables: [
        createTable({
          id: `${this.dbType}-configuration`,
          title: 'Variables',
          emptyMessage: 'No global variables were returned.',
          rows: variableRows,
        }),
      ],
    };
  }

  private async buildReplicationSection(
    capturedAt: string
  ): Promise<InstanceInsightsSection> {
    const replicaStatus = await this.getReplicaStatusRows();
    const sourceReplicas = await this.getConnectedReplicasRows();
    const notes: string[] = [];

    if (replicaStatus.error) {
      notes.push(replicaStatus.error);
    }

    if (sourceReplicas.error) {
      notes.push(sourceReplicas.error);
    }

    const primaryReplicaRow = replicaStatus.rows[0] || {};
    const lagValue = this.pick(
      primaryReplicaRow,
      'seconds_behind_source',
      'seconds_behind_master',
      'seconds_behind_primary'
    );

    const hasReplicationData =
      replicaStatus.rows.length > 0 || sourceReplicas.rows.length > 0;

    if (!hasReplicationData && notes.length === 0) {
      notes.push(
        `${this.databaseLabel} replication is not configured or the current server is only acting as a primary/source.`
      );
    }

    return {
      id: 'replication',
      title: 'Replication',
      subtitle: `${this.databaseLabel} replica and source replication health`,
      status: 'ready',
      capturedAt,
      statusMessage: notes.length ? notes.join(' ') : null,
      cards: [
        {
          id: 'replica-status-rows',
          label: 'Replica Status Rows',
          value: formatNumber(replicaStatus.rows.length),
        },
        {
          id: 'connected-replicas',
          label: 'Connected Replicas',
          value: formatNumber(sourceReplicas.rows.length),
        },
        {
          id: 'replication-lag',
          label: 'Reported Lag',
          value: formatValue(lagValue),
        },
      ],
      tables: [
        createTable({
          id: `${this.dbType}-replica-status`,
          title: 'Replica Status',
          emptyMessage: 'No replica status rows were returned.',
          rows: replicaStatus.rows,
        }),
        createTable({
          id: `${this.dbType}-connected-replicas`,
          title: 'Connected Replicas',
          emptyMessage: 'No connected replicas were returned.',
          rows: sourceReplicas.rows,
        }),
      ],
    };
  }

  private async getLockWaitRows(): Promise<
    QueryOutcome<Record<string, unknown>>
  > {
    if (this.dbType === DatabaseClientType.MARIADB) {
      const result = await this.tryRawQuery<Record<string, unknown>>(`
        SELECT
          trx_id AS transaction_id,
          trx_state AS transaction_state,
          trx_requested_lock_id AS waiting_lock_id,
          trx_wait_started AS wait_started,
          trx_mysql_thread_id AS thread_id,
          trx_query AS query_text
        FROM information_schema.innodb_trx
        ORDER BY trx_wait_started DESC
        LIMIT 200
      `);

      return {
        rows: result.rows.map(row => this.normalizeRowKeys(row)),
        error: result.error,
      };
    }

    const sysResult = await this.tryRawQuery<Record<string, unknown>>(`
      SELECT
        waiting_pid,
        waiting_query,
        blocking_pid,
        blocking_query,
        locked_table,
        locked_index,
        wait_age_secs
      FROM sys.innodb_lock_waits
      ORDER BY wait_age_secs DESC
      LIMIT 200
    `);

    if (!sysResult.error) {
      return {
        rows: sysResult.rows.map(row => this.normalizeRowKeys(row)),
        error: null,
      };
    }

    const perfSchemaResult = await this.tryRawQuery<Record<string, unknown>>(`
      SELECT
        requesting_engine_transaction_id AS waiting_transaction_id,
        blocking_engine_transaction_id AS blocking_transaction_id,
        requesting_thread_id AS waiting_thread_id,
        blocking_thread_id AS blocking_thread_id
      FROM performance_schema.data_lock_waits
      LIMIT 200
    `);

    return {
      rows: perfSchemaResult.rows.map(row => this.normalizeRowKeys(row)),
      error: perfSchemaResult.error,
    };
  }

  private async getMetadataLockRows(): Promise<
    QueryOutcome<Record<string, unknown>>
  > {
    if (this.dbType === DatabaseClientType.MARIADB) {
      const result = await this.tryRawQuery<Record<string, unknown>>(`
        SELECT
          thread_id,
          lock_mode,
          lock_type,
          table_schema AS schema_name,
          table_name
        FROM information_schema.metadata_lock_info
        LIMIT 200
      `);

      return {
        rows: result.rows.map(row => this.normalizeRowKeys(row)),
        error: result.error
          ? 'Metadata lock details are unavailable unless the MariaDB metadata lock plugin is installed.'
          : null,
      };
    }

    const result = await this.tryRawQuery<Record<string, unknown>>(`
      SELECT
        owner_thread_id AS thread_id,
        lock_type,
        lock_status,
        object_schema AS schema_name,
        object_name AS table_name
      FROM performance_schema.metadata_locks
      WHERE object_type = 'TABLE'
      LIMIT 200
    `);

    return {
      rows: result.rows.map(row => this.normalizeRowKeys(row)),
      error: result.error
        ? 'Metadata lock details are unavailable unless performance_schema metadata instrumentation is enabled.'
        : null,
    };
  }

  private async getReplicaStatusRows(): Promise<
    QueryOutcome<Record<string, unknown>>
  > {
    const queries =
      this.dbType === DatabaseClientType.MARIADB
        ? [
            'SHOW ALL REPLICAS STATUS',
            'SHOW REPLICA STATUS',
            'SHOW SLAVE STATUS',
          ]
        : ['SHOW REPLICA STATUS', 'SHOW SLAVE STATUS'];

    for (const query of queries) {
      const result = await this.tryRawQuery<Record<string, unknown>>(query);
      if (!result.error) {
        return {
          rows: result.rows.map(row => this.normalizeRowKeys(row)),
          error: null,
        };
      }
    }

    return {
      rows: [],
      error: `${this.databaseLabel} replication status is unavailable with the current privileges or server mode.`,
    };
  }

  private async getConnectedReplicasRows(): Promise<
    QueryOutcome<Record<string, unknown>>
  > {
    const queries =
      this.dbType === DatabaseClientType.MARIADB
        ? ['SHOW ALL REPLICAS STATUS']
        : ['SHOW REPLICAS', 'SHOW SLAVE HOSTS'];

    for (const query of queries) {
      const result = await this.tryRawQuery<Record<string, unknown>>(query);
      if (!result.error) {
        return {
          rows: result.rows.map(row => this.normalizeRowKeys(row)),
          error: null,
        };
      }
    }

    return {
      rows: [],
      error: `${this.databaseLabel} source-side replica details are unavailable with the current privileges.`,
    };
  }

  private async tryRawQuery<T>(
    sql: string,
    bindings: any[] = []
  ): Promise<QueryOutcome<T>> {
    try {
      const rows = await this.adapter.rawQuery<T>(sql, bindings);
      return {
        rows,
        error: null,
      };
    } catch (error) {
      return {
        rows: [],
        error: this.getErrorMessage(error),
      };
    }
  }

  private normalizeRowKeys(
    row: Record<string, unknown>
  ): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [this.toSnakeKey(key), value])
    );
  }

  private toKeyValueMap(
    rows: Record<string, unknown>[]
  ): Record<string, unknown> {
    return rows.reduce<Record<string, unknown>>((accumulator, row) => {
      const key = this.pick(
        row,
        'Variable_name',
        'VARIABLE_NAME',
        'variable_name',
        'name',
        'NAME'
      );
      const value = this.pick(row, 'Value', 'VALUE', 'value');

      if (key !== null && key !== undefined) {
        accumulator[String(key).toLowerCase()] = value;
      }

      return accumulator;
    }, {});
  }

  private pick(row: Record<string, unknown>, ...keys: string[]): unknown {
    for (const key of keys) {
      if (key in row) {
        return row[key];
      }
    }

    return null;
  }

  private toSnakeKey(value: string): string {
    return value
      .replace(/([a-z\d])([A-Z])/g, '$1_$2')
      .replace(/[\s.-]+/g, '_')
      .toLowerCase();
  }

  private toNumber(value: unknown): number {
    const parsed =
      typeof value === 'number'
        ? value
        : Number.parseFloat(String(value ?? ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private ensurePositiveInteger(value: number, field: string) {
    if (!Number.isInteger(value) || value <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: `${field} must be a positive integer`,
      });
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    const candidate = error as Record<string, unknown>;
    return String(
      candidate?.message || candidate?.statusMessage || 'Unknown database error'
    );
  }

  private get databaseLabel(): string {
    return this.dbType === DatabaseClientType.MARIADB ? 'MariaDB' : 'MySQL';
  }
}
