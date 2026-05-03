import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  InstanceInsightsSection,
  InstanceInsightsView,
} from '~/core/types';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';
import { getDatabaseSource } from '~/server/infrastructure/driver/db-connection';
import { BaseUnsupportedInstanceInsightsAdapter } from '../shared/base-unsupported-instance-insights.adapter';
import {
  createActionCapability,
  createInsightsCapabilities,
  createTable,
  createUnavailableSection,
  formatBytes,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatValue,
} from '../shared/view-helpers';
import type { InstanceInsightsAdapterParams } from '../types';

type QueryOutcome<T> = {
  rows: T[];
  error: string | null;
};

export class OracleInstanceInsightsAdapter extends BaseUnsupportedInstanceInsightsAdapter {
  readonly dbType = DatabaseClientType.ORACLE;

  private readonly adapter: IDatabaseAdapter;

  private constructor(adapter: IDatabaseAdapter) {
    super();
    this.adapter = adapter;
  }

  static async create(
    params: InstanceInsightsAdapterParams
  ): Promise<OracleInstanceInsightsAdapter> {
    const adapter = await getDatabaseSource({
      ...params,
      type: DatabaseClientType.ORACLE,
    });

    return new OracleInstanceInsightsAdapter(adapter);
  }

  override async getView(): Promise<InstanceInsightsView> {
    const capturedAt = new Date().toISOString();
    const [overview, sessions, memoryLimits, configuration, dataGuard] =
      await Promise.all([
        this.buildOverviewSection(capturedAt),
        this.buildSessionsSection(capturedAt),
        this.buildMemoryLimitsSection(capturedAt),
        this.buildConfigurationSection(capturedAt),
        this.buildDataGuardSection(capturedAt),
      ]);

    const version = overview.cards?.find(card => card.id === 'version')?.value;

    return {
      dbType: this.dbType,
      title: 'Instance Insights',
      databaseName: null,
      version: version && version !== '-' ? version : null,
      capturedAt,
      capabilities: createInsightsCapabilities({
        supportsSessionInspection: true,
        supportsLockInspection: true,
        supportsConfiguration: true,
        supportsDataGuard: true,
        supportsMemoryLimits: true,
      }),
      actions: [
        createActionCapability({
          id: 'kill-session',
          label: 'Kill Session',
          state: 'unsupported',
          description:
            'Oracle session termination is reserved for a later phase.',
        }),
      ],
      sections: [overview, sessions, memoryLimits, configuration, dataGuard],
    };
  }

  private async buildOverviewSection(
    capturedAt: string
  ): Promise<InstanceInsightsSection> {
    const instanceResult = await this.tryRawQuery<Record<string, unknown>>(`
      SELECT
        instance_name,
        host_name,
        version,
        startup_time,
        status AS instance_status,
        active_state,
        instance_role
      FROM v$instance
    `);

    if (instanceResult.error || !instanceResult.rows[0]) {
      return createUnavailableSection(
        'overview',
        'Overview',
        'Oracle instance state and throughput metrics',
        instanceResult.error || 'No Oracle instance details were returned.',
        capturedAt
      );
    }

    const metricsResult = await this.tryRawQuery<Record<string, unknown>>(`
      SELECT metric_name, value, metric_unit
      FROM v$sysmetric
      WHERE metric_name IN (
        'Logical Reads Per Sec',
        'Physical Reads Per Sec',
        'Executions Per Sec',
        'Redo Generated Per Sec',
        'User Calls Per Sec'
      )
    `);

    const instance = this.normalizeRowKeys(instanceResult.rows[0]);
    const metrics = metricsResult.rows.map(row => this.normalizeRowKeys(row));
    const metricMap = metrics.reduce<Record<string, unknown>>(
      (accumulator, row) => {
        const metricName = String(this.pick(row, 'metric_name') || '');
        accumulator[metricName] = this.pick(row, 'value');
        return accumulator;
      },
      {}
    );

    return {
      id: 'overview',
      title: 'Overview',
      subtitle: 'Oracle instance state and throughput metrics',
      status: 'ready',
      capturedAt,
      statusMessage: metricsResult.error,
      cards: [
        {
          id: 'instance-name',
          label: 'Instance',
          value: formatValue(this.pick(instance, 'instance_name')),
        },
        {
          id: 'status',
          label: 'Status',
          value: formatValue(this.pick(instance, 'instance_status')),
        },
        {
          id: 'active-state',
          label: 'Active State',
          value: formatValue(this.pick(instance, 'active_state')),
        },
        {
          id: 'role',
          label: 'Instance Role',
          value: formatValue(this.pick(instance, 'instance_role')),
        },
        {
          id: 'version',
          label: 'Version',
          value: formatValue(this.pick(instance, 'version')),
        },
        {
          id: 'logical-reads',
          label: 'Logical Reads/Sec',
          value: formatNumber(metricMap['Logical Reads Per Sec'], 2),
        },
        {
          id: 'physical-reads',
          label: 'Physical Reads/Sec',
          value: formatNumber(metricMap['Physical Reads Per Sec'], 2),
        },
        {
          id: 'executions',
          label: 'Executions/Sec',
          value: formatNumber(metricMap['Executions Per Sec'], 2),
        },
      ],
      details: [
        {
          label: 'Host Name',
          value: formatValue(this.pick(instance, 'host_name')),
        },
        {
          label: 'Startup Time',
          value: formatDateTime(this.pick(instance, 'startup_time')),
        },
        {
          label: 'Redo Generated/Sec',
          value: formatNumber(metricMap['Redo Generated Per Sec'], 2),
        },
        {
          label: 'User Calls/Sec',
          value: formatNumber(metricMap['User Calls Per Sec'], 2),
        },
      ],
      tables: [
        createTable({
          id: 'oracle-throughput-metrics',
          title: 'Throughput Metrics',
          emptyMessage: 'No throughput metrics were returned.',
          rows: metrics,
        }),
      ],
    };
  }

  private async buildSessionsSection(
    capturedAt: string
  ): Promise<InstanceInsightsSection> {
    const sessionsResult = await this.tryRawQuery<Record<string, unknown>>(`
      SELECT
        sid,
        serial# AS serial_number,
        username,
        machine,
        program,
        module,
        event,
        wait_class,
        status
      FROM v$session
      WHERE type = 'USER'
        AND ROWNUM <= 200
    `);

    if (sessionsResult.error) {
      return createUnavailableSection(
        'sessions-locks',
        'Sessions & Locks',
        'Oracle sessions, waits, and lock visibility',
        sessionsResult.error,
        capturedAt
      );
    }

    const locksResult = await this.tryRawQuery<Record<string, unknown>>(`
      SELECT
        sid,
        type AS lock_type,
        lmode AS held_mode,
        request AS requested_mode,
        block AS blocking_flag,
        ctime AS lock_age_seconds
      FROM v$lock
      WHERE ROWNUM <= 200
    `);

    return {
      id: 'sessions-locks',
      title: 'Sessions & Locks',
      subtitle: 'Oracle sessions, waits, and lock visibility',
      status: 'ready',
      capturedAt,
      statusMessage: locksResult.error,
      cards: [
        {
          id: 'session-count',
          label: 'Visible Sessions',
          value: formatNumber(sessionsResult.rows.length),
        },
        {
          id: 'lock-count',
          label: 'Visible Locks',
          value: formatNumber(locksResult.rows.length),
        },
      ],
      tables: [
        createTable({
          id: 'oracle-sessions',
          title: 'Sessions',
          emptyMessage: 'No Oracle sessions were returned.',
          rows: sessionsResult.rows.map(row => this.normalizeRowKeys(row)),
        }),
        createTable({
          id: 'oracle-locks',
          title: 'Locks',
          emptyMessage: 'No Oracle locks were returned.',
          rows: locksResult.rows.map(row => this.normalizeRowKeys(row)),
        }),
      ],
    };
  }

  private async buildMemoryLimitsSection(
    capturedAt: string
  ): Promise<InstanceInsightsSection> {
    const [sgaResult, pgaResult, limitResult] = await Promise.all([
      this.tryRawQuery<Record<string, unknown>>(`
        SELECT name, value AS bytes
        FROM v$sga
      `),
      this.tryRawQuery<Record<string, unknown>>(`
        SELECT name, value, unit
        FROM v$pgastat
        WHERE name IN (
          'aggregate PGA target parameter',
          'total PGA allocated',
          'maximum PGA allocated'
        )
      `),
      this.tryRawQuery<Record<string, unknown>>(`
        SELECT
          resource_name,
          current_utilization,
          max_utilization,
          limit_value
        FROM v$resource_limit
        WHERE resource_name IN ('sessions', 'processes', 'transactions')
      `),
    ]);

    if (sgaResult.error && pgaResult.error && limitResult.error) {
      return createUnavailableSection(
        'memory-limits',
        'Memory & Limits',
        'SGA, PGA, and resource ceiling visibility',
        sgaResult.error ||
          pgaResult.error ||
          limitResult.error ||
          'Oracle memory views are unavailable.',
        capturedAt
      );
    }

    const sgaRows = sgaResult.rows.map(row => this.normalizeRowKeys(row));
    const pgaRows = pgaResult.rows.map(row => this.normalizeRowKeys(row));
    const limitRows = limitResult.rows.map(row => this.normalizeRowKeys(row));
    const totalSgaBytes = sgaRows.reduce(
      (sum, row) => sum + this.toNumber(this.pick(row, 'bytes')),
      0
    );
    const totalPgaAllocated = pgaRows.find(
      row => this.pick(row, 'name') === 'total PGA allocated'
    );
    const sessionsLimit = limitRows.find(
      row => this.pick(row, 'resource_name') === 'sessions'
    );

    const sessionsLimitValue = this.pick(sessionsLimit || {}, 'limit_value');
    const sessionsUsage = this.toNumber(
      this.pick(sessionsLimit || {}, 'current_utilization')
    );
    const sessionsUsagePercent =
      this.toNumber(sessionsLimitValue) > 0
        ? (sessionsUsage / this.toNumber(sessionsLimitValue)) * 100
        : 0;

    return {
      id: 'memory-limits',
      title: 'Memory & Limits',
      subtitle: 'SGA, PGA, and resource ceiling visibility',
      status: 'ready',
      capturedAt,
      statusMessage: [sgaResult.error, pgaResult.error, limitResult.error]
        .filter(Boolean)
        .join(' '),
      cards: [
        {
          id: 'total-sga',
          label: 'Total SGA',
          value: formatBytes(totalSgaBytes),
        },
        {
          id: 'total-pga-allocated',
          label: 'Total PGA Allocated',
          value: formatBytes(this.pick(totalPgaAllocated || {}, 'value')),
        },
        {
          id: 'sessions-usage',
          label: 'Sessions Usage',
          value: formatPercent(sessionsUsagePercent, 2),
          helperText: `${formatNumber(sessionsUsage)} of ${formatValue(sessionsLimitValue)}`,
        },
      ],
      tables: [
        createTable({
          id: 'oracle-sga',
          title: 'SGA Components',
          emptyMessage: 'No SGA component data was returned.',
          rows: sgaRows.map(row => ({
            name: this.pick(row, 'name'),
            bytes: formatBytes(this.pick(row, 'bytes')),
          })),
        }),
        createTable({
          id: 'oracle-pga',
          title: 'PGA Statistics',
          emptyMessage: 'No PGA statistics were returned.',
          rows: pgaRows.map(row => ({
            name: this.pick(row, 'name'),
            value: formatValue(this.pick(row, 'value')),
            unit: this.pick(row, 'unit'),
          })),
        }),
        createTable({
          id: 'oracle-resource-limits',
          title: 'Resource Limits',
          emptyMessage: 'No resource limit rows were returned.',
          rows: limitRows,
        }),
      ],
    };
  }

  private async buildConfigurationSection(
    capturedAt: string
  ): Promise<InstanceInsightsSection> {
    const configurationResult = await this.tryRawQuery<
      Record<string, unknown>
    >(`
      SELECT
        name,
        display_value,
        isdefault,
        ismodified,
        issys_modifiable,
        isdeprecated,
        description
      FROM v$system_parameter
      WHERE ROWNUM <= 1000
      ORDER BY name
    `);

    if (configurationResult.error) {
      return createUnavailableSection(
        'configuration',
        'Configuration',
        'Oracle system parameter visibility',
        configurationResult.error,
        capturedAt
      );
    }

    const rows = configurationResult.rows.map(row =>
      this.normalizeRowKeys(row)
    );

    return {
      id: 'configuration',
      title: 'Configuration',
      subtitle: 'Oracle system parameter visibility',
      status: 'ready',
      capturedAt,
      searchable: true,
      searchPlaceholder: 'Search parameter name or description...',
      cards: [
        {
          id: 'parameter-count',
          label: 'Parameters',
          value: formatNumber(rows.length),
        },
      ],
      tables: [
        createTable({
          id: 'oracle-configuration',
          title: 'System Parameters',
          emptyMessage: 'No system parameters were returned.',
          rows,
        }),
      ],
    };
  }

  private async buildDataGuardSection(
    capturedAt: string
  ): Promise<InstanceInsightsSection> {
    const [statsResult, archiveResult] = await Promise.all([
      this.tryRawQuery<Record<string, unknown>>(`
        SELECT name, value, unit
        FROM v$dataguard_stats
      `),
      this.tryRawQuery<Record<string, unknown>>(`
        SELECT
          dest_id,
          status,
          destination,
          target,
          db_unique_name,
          archiver,
          process,
          error,
          recovery_mode,
          protection_mode
        FROM v$archive_dest_status
        WHERE status <> 'INACTIVE'
          AND ROWNUM <= 200
      `),
    ]);

    const statsRows = statsResult.rows.map(row => this.normalizeRowKeys(row));
    const archiveRows = archiveResult.rows.map(row =>
      this.normalizeRowKeys(row)
    );

    if (
      statsRows.length === 0 &&
      archiveRows.length === 0 &&
      !statsResult.error &&
      !archiveResult.error
    ) {
      return createUnavailableSection(
        'data-guard',
        'Data Guard',
        'Standby and archive destination health',
        'Data Guard metrics are empty. This database may not be running in a Data Guard topology.',
        capturedAt
      );
    }

    if (statsResult.error && archiveResult.error) {
      return createUnavailableSection(
        'data-guard',
        'Data Guard',
        'Standby and archive destination health',
        `${statsResult.error} ${archiveResult.error}`.trim(),
        capturedAt
      );
    }

    const applyLagRow = statsRows.find(
      row => this.pick(row, 'name') === 'apply lag'
    );

    return {
      id: 'data-guard',
      title: 'Data Guard',
      subtitle: 'Standby and archive destination health',
      status: 'ready',
      capturedAt,
      statusMessage: [statsResult.error, archiveResult.error]
        .filter(Boolean)
        .join(' '),
      cards: [
        {
          id: 'apply-lag',
          label: 'Apply Lag',
          value: formatValue(this.pick(applyLagRow || {}, 'value')),
        },
        {
          id: 'destinations',
          label: 'Archive Destinations',
          value: formatNumber(archiveRows.length),
        },
      ],
      tables: [
        createTable({
          id: 'oracle-dataguard-stats',
          title: 'Data Guard Stats',
          emptyMessage: 'No Data Guard stats were returned.',
          rows: statsRows,
        }),
        createTable({
          id: 'oracle-archive-destinations',
          title: 'Archive Destination Status',
          emptyMessage: 'No archive destination rows were returned.',
          rows: archiveRows,
        }),
      ],
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

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    const candidate = error as Record<string, unknown>;
    return String(
      candidate?.message || candidate?.statusMessage || 'Unknown database error'
    );
  }
}
