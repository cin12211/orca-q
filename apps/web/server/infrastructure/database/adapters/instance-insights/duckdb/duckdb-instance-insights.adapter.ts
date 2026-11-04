import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  InstanceInsightsSection,
  InstanceInsightsView,
} from '~/core/types';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';
import { getDatabaseSource } from '~/server/infrastructure/driver/db-connection';
import { BaseUnsupportedInstanceInsightsAdapter } from '../shared/base-unsupported-instance-insights.adapter';
import {
  createInsightsCapabilities,
  createTable,
  createUnavailableSection,
  formatNumber,
  formatValue,
} from '../shared/view-helpers';
import type { InstanceInsightsAdapterParams } from '../types';

type Row = Record<string, unknown>;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown database error';
}

export class DuckDbInstanceInsightsAdapter extends BaseUnsupportedInstanceInsightsAdapter {
  readonly dbType = DatabaseClientType.DUCKDB;

  private readonly adapter: IDatabaseAdapter;

  private constructor(adapter: IDatabaseAdapter) {
    super();
    this.adapter = adapter;
  }

  static async create(
    params: InstanceInsightsAdapterParams
  ): Promise<DuckDbInstanceInsightsAdapter> {
    const adapter = await getDatabaseSource({
      ...params,
      type: DatabaseClientType.DUCKDB,
    });

    return new DuckDbInstanceInsightsAdapter(adapter);
  }

  override async getView(): Promise<InstanceInsightsView> {
    const capturedAt = new Date().toISOString();
    const [versionRow] = await this.adapter
      .rawQuery<{ version: string }>('SELECT version() AS version')
      .catch(() => []);

    const [overview, configuration] = await Promise.all([
      this.buildOverviewSection(capturedAt),
      this.buildConfigurationSection(capturedAt),
    ]);

    return {
      dbType: this.dbType,
      title: 'Instance Insights',
      databaseName: null,
      version: versionRow?.version ?? null,
      capturedAt,
      capabilities: createInsightsCapabilities({
        supportsConfiguration: true,
      }),
      actions: [],
      sections: [overview, configuration],
    };
  }

  private async buildOverviewSection(
    capturedAt: string
  ): Promise<InstanceInsightsSection> {
    const subtitle = 'Attached databases and storage usage';

    try {
      const [sizeRows, databases] = await Promise.all([
        this.adapter.rawQuery<Row>('PRAGMA database_size'),
        this.adapter.rawQuery<Row>(
          `
            SELECT database_name, path, type, readonly
            FROM duckdb_databases()
            WHERE NOT internal
            ORDER BY database_name
          `
        ),
      ]);
      const size = sizeRows[0] ?? {};

      return {
        id: 'overview',
        title: 'Overview',
        subtitle,
        status: 'ready',
        capturedAt,
        cards: [
          {
            id: 'database-size',
            label: 'Database Size',
            value: formatValue(size.database_size),
          },
          {
            id: 'wal-size',
            label: 'WAL Size',
            value: formatValue(size.wal_size),
          },
          {
            id: 'memory-usage',
            label: 'Memory Usage',
            value: formatValue(size.memory_usage),
          },
          {
            id: 'memory-limit',
            label: 'Memory Limit',
            value: formatValue(size.memory_limit),
          },
          {
            id: 'attached-databases',
            label: 'Attached Databases',
            value: formatNumber(databases.length),
          },
        ],
        tables: [
          createTable({
            id: 'duckdb-databases',
            title: 'Attached Databases',
            emptyMessage: 'No attached databases were returned.',
            rows: databases,
          }),
        ],
      };
    } catch (error) {
      return createUnavailableSection(
        'overview',
        'Overview',
        subtitle,
        getErrorMessage(error),
        capturedAt
      );
    }
  }

  private async buildConfigurationSection(
    capturedAt: string
  ): Promise<InstanceInsightsSection> {
    const subtitle = 'DuckDB settings';

    try {
      const rows = await this.adapter.rawQuery<Row>(
        `
          SELECT name, value, description
          FROM duckdb_settings()
          ORDER BY name
        `
      );

      return {
        id: 'configuration',
        title: 'Configuration',
        subtitle,
        status: 'ready',
        capturedAt,
        searchable: true,
        searchPlaceholder: 'Search setting name or value...',
        cards: [],
        tables: [
          createTable({
            id: 'duckdb-settings',
            title: 'Settings',
            emptyMessage: 'No settings were returned.',
            rows,
          }),
        ],
      };
    } catch (error) {
      return createUnavailableSection(
        'configuration',
        'Configuration',
        subtitle,
        getErrorMessage(error),
        capturedAt
      );
    }
  }
}
