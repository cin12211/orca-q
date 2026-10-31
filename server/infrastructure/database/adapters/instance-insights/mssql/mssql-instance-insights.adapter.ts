import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  InstanceInsightsSection,
  InstanceInsightsView,
} from '~/core/types';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';
import { getDatabaseSource } from '~/server/infrastructure/driver/db-connection';
import { BaseUnsupportedInstanceInsightsAdapter } from '../shared/base-unsupported-instance-insights.adapter';
import { trySafeQuery } from '../shared/safe-query';
import {
  createActionCapability,
  createInsightsCapabilities,
  createTable,
  createUnavailableSection,
  formatBytes,
  formatDateTime,
  formatNumber,
  formatValue,
} from '../shared/view-helpers';
import type { InstanceInsightsAdapterParams } from '../types';

const PERMISSION_HINT =
  'Server-level details need the VIEW SERVER STATE permission (VIEW DATABASE STATE on Azure SQL Database).';

/**
 * Read-only Instance Insights for SQL Server: server overview, user sessions
 * with their running requests, and server configuration. KILL is
 * intentionally not offered.
 */
export class MssqlInstanceInsightsAdapter extends BaseUnsupportedInstanceInsightsAdapter {
  readonly dbType = DatabaseClientType.MSSQL;

  private readonly adapter: IDatabaseAdapter;

  private constructor(adapter: IDatabaseAdapter) {
    super();
    this.adapter = adapter;
  }

  static async create(
    params: InstanceInsightsAdapterParams
  ): Promise<MssqlInstanceInsightsAdapter> {
    const adapter = await getDatabaseSource({
      ...params,
      type: DatabaseClientType.MSSQL,
    });

    return new MssqlInstanceInsightsAdapter(adapter);
  }

  override async getView(): Promise<InstanceInsightsView> {
    const capturedAt = new Date().toISOString();
    const [overview, sessions, configuration] = await Promise.all([
      this.buildOverviewSection(capturedAt),
      this.buildSessionsSection(capturedAt),
      this.buildConfigurationSection(capturedAt),
    ]);

    const version = overview.cards?.find(card => card.id === 'version')?.value;
    const databaseName = overview.details?.find(
      detail => detail.label === 'Database'
    )?.value;

    return {
      dbType: this.dbType,
      title: 'Instance Insights',
      databaseName: databaseName && databaseName !== '-' ? databaseName : null,
      version: version && version !== '-' ? version : null,
      capturedAt,
      capabilities: createInsightsCapabilities({
        supportsSessionInspection: true,
        supportsConfiguration: true,
      }),
      actions: [
        createActionCapability({
          id: 'kill-session',
          label: 'Kill Session',
          state: 'unsupported',
          description: 'Instance Insights is read-only for SQL Server.',
        }),
      ],
      sections: [overview, sessions, configuration],
    };
  }

  private async buildOverviewSection(
    capturedAt: string
  ): Promise<InstanceInsightsSection> {
    const subtitle = 'Server version, edition, and resources';
    const [infoResult, osResult] = await Promise.all([
      trySafeQuery<Record<string, unknown>>(
        this.adapter,
        `SELECT
          CAST(SERVERPROPERTY('ProductVersion') AS NVARCHAR(128)) AS product_version,
          CAST(SERVERPROPERTY('ProductLevel') AS NVARCHAR(128)) AS product_level,
          CAST(SERVERPROPERTY('Edition') AS NVARCHAR(128)) AS edition,
          @@SERVERNAME AS server_name,
          DB_NAME() AS database_name,
          SUSER_SNAME() AS login_name,
          (SELECT COUNT(*) FROM sys.databases) AS database_count`
      ),
      trySafeQuery<Record<string, unknown>>(
        this.adapter,
        `SELECT sqlserver_start_time, cpu_count, physical_memory_kb
         FROM sys.dm_os_sys_info`
      ),
    ]);

    const info = infoResult.rows[0];

    if (infoResult.error || !info) {
      return createUnavailableSection(
        'overview',
        'Overview',
        subtitle,
        infoResult.error || 'No server details were returned.',
        capturedAt
      );
    }

    const os = osResult.rows[0];

    return {
      id: 'overview',
      title: 'Overview',
      subtitle,
      status: 'ready',
      capturedAt,
      statusMessage: osResult.error ? PERMISSION_HINT : null,
      cards: [
        {
          id: 'version',
          label: 'Version',
          value: formatValue(info.product_version),
        },
        { id: 'edition', label: 'Edition', value: formatValue(info.edition) },
        {
          id: 'databases',
          label: 'Databases',
          value: formatNumber(info.database_count),
        },
        {
          id: 'cpus',
          label: 'CPUs',
          value: os ? formatNumber(os.cpu_count) : '-',
        },
      ],
      details: [
        { label: 'Server', value: formatValue(info.server_name) },
        { label: 'Database', value: formatValue(info.database_name) },
        { label: 'Login', value: formatValue(info.login_name) },
        { label: 'Product Level', value: formatValue(info.product_level) },
        {
          label: 'Started',
          value: os ? formatDateTime(os.sqlserver_start_time) : '-',
        },
        {
          label: 'Physical Memory',
          value: os ? formatBytes(Number(os.physical_memory_kb) * 1024) : '-',
        },
      ],
    };
  }

  private async buildSessionsSection(
    capturedAt: string
  ): Promise<InstanceInsightsSection> {
    const subtitle = 'User sessions and their running requests';
    const result = await trySafeQuery<Record<string, unknown>>(
      this.adapter,
      `SELECT TOP 200
        s.session_id,
        s.login_name,
        s.host_name,
        s.program_name,
        s.status,
        DB_NAME(s.database_id) AS database_name,
        s.login_time,
        r.status AS request_status,
        r.command,
        r.wait_type,
        r.blocking_session_id,
        r.total_elapsed_time AS elapsed_ms,
        LEFT(t.text, 4000) AS sql_text
       FROM sys.dm_exec_sessions s
       LEFT JOIN sys.dm_exec_requests r ON r.session_id = s.session_id
       OUTER APPLY sys.dm_exec_sql_text(r.sql_handle) t
       WHERE s.is_user_process = 1
       ORDER BY s.session_id`
    );

    if (result.error) {
      return createUnavailableSection(
        'sessions-locks',
        'Sessions',
        subtitle,
        `${result.error} ${PERMISSION_HINT}`,
        capturedAt
      );
    }

    const running = result.rows.filter(row => row.request_status);
    const blocked = result.rows.filter(
      row => Number(row.blocking_session_id) > 0
    );

    return {
      id: 'sessions-locks',
      title: 'Sessions',
      subtitle,
      status: 'ready',
      capturedAt,
      cards: [
        {
          id: 'session-count',
          label: 'User Sessions',
          value: formatNumber(result.rows.length),
        },
        {
          id: 'running-count',
          label: 'Running Requests',
          value: formatNumber(running.length),
        },
        {
          id: 'blocked-count',
          label: 'Blocked',
          value: formatNumber(blocked.length),
          tone: blocked.length > 0 ? 'warning' : 'default',
        },
      ],
      tables: [
        createTable({
          id: 'mssql-sessions',
          title: 'Sessions',
          emptyMessage: 'No user sessions were returned.',
          rows: result.rows,
        }),
      ],
    };
  }

  private async buildConfigurationSection(
    capturedAt: string
  ): Promise<InstanceInsightsSection> {
    const subtitle = 'Server configuration options (sys.configurations)';
    const result = await trySafeQuery<Record<string, unknown>>(
      this.adapter,
      `SELECT
        name,
        CAST(value_in_use AS NVARCHAR(256)) AS value_in_use,
        CAST(value AS NVARCHAR(256)) AS configured_value,
        is_dynamic,
        is_advanced,
        description
       FROM sys.configurations
       ORDER BY name`
    );

    if (result.error) {
      return createUnavailableSection(
        'configuration',
        'Configuration',
        subtitle,
        result.error,
        capturedAt
      );
    }

    return {
      id: 'configuration',
      title: 'Configuration',
      subtitle,
      status: 'ready',
      capturedAt,
      searchable: true,
      searchPlaceholder: 'Search option name or description...',
      cards: [
        {
          id: 'option-count',
          label: 'Options',
          value: formatNumber(result.rows.length),
        },
      ],
      tables: [
        createTable({
          id: 'mssql-configuration',
          title: 'Configuration Options',
          emptyMessage: 'No configuration options were returned.',
          rows: result.rows,
        }),
      ],
    };
  }
}
