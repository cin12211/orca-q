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
  formatBoolean,
  formatBytes,
  formatNumber,
  formatValue,
} from '../shared/view-helpers';
import type { InstanceInsightsAdapterParams } from '../types';

type QueryOutcome<T> = {
  rows: T[];
  error: string | null;
};

export class SqliteInstanceInsightsAdapter extends BaseUnsupportedInstanceInsightsAdapter {
  readonly dbType = DatabaseClientType.SQLITE3;

  private readonly adapter: IDatabaseAdapter;

  private constructor(adapter: IDatabaseAdapter) {
    super();
    this.adapter = adapter;
  }

  static async create(
    params: InstanceInsightsAdapterParams
  ): Promise<SqliteInstanceInsightsAdapter> {
    const adapter = await getDatabaseSource({
      ...params,
      type: DatabaseClientType.SQLITE3,
    });

    return new SqliteInstanceInsightsAdapter(adapter);
  }

  override async getView(): Promise<InstanceInsightsView> {
    const capturedAt = new Date().toISOString();
    const versionResult = await this.tryRawQuery<{ version: string }>(
      'SELECT sqlite_version() AS version'
    );
    const version = versionResult.rows[0]
      ? String(this.pick(versionResult.rows[0], 'version') ?? '')
      : null;

    const [overview, storageHealth, configuration, integrity] =
      await Promise.all([
        this.buildOverviewSection(capturedAt),
        this.buildStorageHealthSection(capturedAt),
        this.buildConfigurationSection(capturedAt),
        this.buildIntegritySection(capturedAt),
      ]);

    return {
      dbType: this.dbType,
      title: 'Instance Insights',
      databaseName: null,
      version,
      capturedAt,
      capabilities: createInsightsCapabilities({
        supportsConfiguration: true,
        supportsStorageHealth: true,
        supportsIntegrityChecks: true,
      }),
      actions: [
        createActionCapability({
          id: 'checkpoint',
          label: 'Checkpoint',
          state: 'unsupported',
          description:
            'Checkpoint controls are reserved for a later SQLite phase.',
        }),
        createActionCapability({
          id: 'vacuum-recommendation',
          label: 'Vacuum Recommendation',
          state: 'conditional',
          description:
            'Storage-health warnings highlight reclaimable space without running VACUUM automatically.',
        }),
      ],
      sections: [overview, storageHealth, configuration, integrity],
    };
  }

  private async buildOverviewSection(
    capturedAt: string
  ): Promise<InstanceInsightsSection> {
    const [
      databaseList,
      pageCount,
      pageSize,
      journalMode,
      lockingMode,
      autoVacuum,
    ] = await Promise.all([
      this.tryRawQuery<Record<string, unknown>>('PRAGMA database_list'),
      this.tryRawQuery<Record<string, unknown>>('PRAGMA page_count'),
      this.tryRawQuery<Record<string, unknown>>('PRAGMA page_size'),
      this.tryRawQuery<Record<string, unknown>>('PRAGMA journal_mode'),
      this.tryRawQuery<Record<string, unknown>>('PRAGMA locking_mode'),
      this.tryRawQuery<Record<string, unknown>>('PRAGMA auto_vacuum'),
    ]);

    if (databaseList.error && pageCount.error && pageSize.error) {
      return createUnavailableSection(
        'overview',
        'Overview',
        'SQLite database/file shape and mode',
        databaseList.error ||
          pageCount.error ||
          pageSize.error ||
          'SQLite overview data is unavailable.',
        capturedAt
      );
    }

    const pageCountValue = this.toNumber(this.firstRowValue(pageCount.rows[0]));
    const pageSizeValue = this.toNumber(this.firstRowValue(pageSize.rows[0]));
    const approximateFileSize = pageCountValue * pageSizeValue;
    const journalModeValue = this.firstRowValue(journalMode.rows[0]);
    const lockingModeValue = this.firstRowValue(lockingMode.rows[0]);
    const autoVacuumValue = this.firstRowValue(autoVacuum.rows[0]);
    const dbRows = databaseList.rows.map(row => this.normalizeRowKeys(row));
    const mainDatabase = dbRows.find(row => this.pick(row, 'name') === 'main');

    return {
      id: 'overview',
      title: 'Overview',
      subtitle: 'SQLite database/file shape and mode',
      status: 'ready',
      capturedAt,
      statusMessage: [
        databaseList.error,
        pageCount.error,
        pageSize.error,
        journalMode.error,
        lockingMode.error,
        autoVacuum.error,
      ]
        .filter(Boolean)
        .join(' '),
      cards: [
        {
          id: 'page-count',
          label: 'Page Count',
          value: formatNumber(pageCountValue),
        },
        {
          id: 'page-size',
          label: 'Page Size',
          value: formatBytes(pageSizeValue),
        },
        {
          id: 'approx-size',
          label: 'Approx File Size',
          value: formatBytes(approximateFileSize),
        },
        {
          id: 'journal-mode',
          label: 'Journal Mode',
          value: formatValue(journalModeValue),
        },
        {
          id: 'locking-mode',
          label: 'Locking Mode',
          value: formatValue(lockingModeValue),
        },
        {
          id: 'attached-databases',
          label: 'Attached Databases',
          value: formatNumber(dbRows.length),
        },
      ],
      details: [
        {
          label: 'Main File Path',
          value: formatValue(this.pick(mainDatabase || {}, 'file')),
        },
        {
          label: 'Auto Vacuum',
          value: this.describeAutoVacuum(autoVacuumValue),
        },
      ],
      tables: [
        createTable({
          id: 'sqlite-database-list',
          title: 'Attached Databases',
          emptyMessage: 'No attached databases were returned.',
          rows: dbRows,
        }),
      ],
    };
  }

  private async buildStorageHealthSection(
    capturedAt: string
  ): Promise<InstanceInsightsSection> {
    const [freelistCount, pageSize, tableList, walAutocheckpoint, journalMode] =
      await Promise.all([
        this.tryRawQuery<Record<string, unknown>>('PRAGMA freelist_count'),
        this.tryRawQuery<Record<string, unknown>>('PRAGMA page_size'),
        this.tryRawQuery<Record<string, unknown>>('PRAGMA table_list'),
        this.tryRawQuery<Record<string, unknown>>('PRAGMA wal_autocheckpoint'),
        this.tryRawQuery<Record<string, unknown>>('PRAGMA journal_mode'),
      ]);

    if (freelistCount.error && tableList.error) {
      return createUnavailableSection(
        'storage-health',
        'Storage Health',
        'Freelist, WAL, and table inventory visibility',
        freelistCount.error ||
          tableList.error ||
          'SQLite storage health data is unavailable.',
        capturedAt
      );
    }

    const freelistValue = this.toNumber(
      this.firstRowValue(freelistCount.rows[0])
    );
    const pageSizeValue = this.toNumber(this.firstRowValue(pageSize.rows[0]));
    const reclaimableBytes = freelistValue * pageSizeValue;
    const journalModeValue = String(
      this.firstRowValue(journalMode.rows[0]) || ''
    );
    const walEnabled = journalModeValue.toLowerCase() === 'wal';
    const walAutocheckpointValue = this.firstRowValue(
      walAutocheckpoint.rows[0]
    );
    const tableRows = tableList.rows.map(row => this.normalizeRowKeys(row));

    return {
      id: 'storage-health',
      title: 'Storage Health',
      subtitle: 'Freelist, WAL, and table inventory visibility',
      status: 'ready',
      capturedAt,
      statusMessage: [
        freelistCount.error,
        pageSize.error,
        tableList.error,
        walAutocheckpoint.error,
        journalMode.error,
      ]
        .filter(Boolean)
        .join(' '),
      cards: [
        {
          id: 'freelist-count',
          label: 'Freelist Pages',
          value: formatNumber(freelistValue),
        },
        {
          id: 'reclaimable-bytes',
          label: 'Reclaimable Bytes',
          value: formatBytes(reclaimableBytes),
          tone: reclaimableBytes > 0 ? 'warning' : 'default',
        },
        {
          id: 'wal-enabled',
          label: 'WAL Enabled',
          value: walEnabled ? 'Yes' : 'No',
        },
        {
          id: 'table-count',
          label: 'Table Inventory',
          value: formatNumber(tableRows.length),
        },
      ],
      details: [
        {
          label: 'WAL Auto-checkpoint',
          value: formatValue(walAutocheckpointValue),
        },
      ],
      tables: [
        createTable({
          id: 'sqlite-table-list',
          title: 'Table Inventory',
          emptyMessage: 'No table inventory rows were returned.',
          rows: tableRows,
        }),
      ],
      checks:
        reclaimableBytes > 0
          ? [
              {
                id: 'reclaimable-space',
                label: 'Reclaimable Space Detected',
                detail: `${formatBytes(reclaimableBytes)} can be reclaimed based on the current freelist count.`,
                status: 'warn',
                tone: 'warning',
              },
            ]
          : undefined,
    };
  }

  private async buildConfigurationSection(
    capturedAt: string
  ): Promise<InstanceInsightsSection> {
    const pragmaEntries = await Promise.all([
      this.readPragmaEntry('foreign_keys', 'PRAGMA foreign_keys'),
      this.readPragmaEntry('synchronous', 'PRAGMA synchronous'),
      this.readPragmaEntry('mmap_size', 'PRAGMA mmap_size'),
      this.readPragmaEntry('cache_size', 'PRAGMA cache_size'),
      this.readPragmaEntry('query_only', 'PRAGMA query_only'),
      this.readPragmaEntry('read_uncommitted', 'PRAGMA read_uncommitted'),
      this.readPragmaEntry('trusted_schema', 'PRAGMA trusted_schema'),
    ]);

    const errors = pragmaEntries.map(entry => entry.error).filter(Boolean);
    const rows = pragmaEntries
      .filter(entry => entry.value !== null)
      .map(entry => ({
        name: entry.name,
        value: entry.value,
      }));

    if (!rows.length && errors.length) {
      return createUnavailableSection(
        'configuration',
        'Configuration',
        'SQLite PRAGMA settings',
        errors.join(' '),
        capturedAt
      );
    }

    return {
      id: 'configuration',
      title: 'Configuration',
      subtitle: 'SQLite PRAGMA settings',
      status: 'ready',
      capturedAt,
      searchable: true,
      searchPlaceholder: 'Search PRAGMA name or value...',
      statusMessage: errors.join(' '),
      cards: [
        {
          id: 'foreign-keys',
          label: 'Foreign Keys',
          value: formatBoolean(
            rows.find(row => row.name === 'foreign_keys')?.value
          ),
        },
        {
          id: 'query-only',
          label: 'Query Only',
          value: formatBoolean(
            rows.find(row => row.name === 'query_only')?.value
          ),
        },
      ],
      tables: [
        createTable({
          id: 'sqlite-configuration',
          title: 'PRAGMA Settings',
          emptyMessage: 'No PRAGMA settings were returned.',
          rows,
        }),
      ],
    };
  }

  private async buildIntegritySection(
    capturedAt: string
  ): Promise<InstanceInsightsSection> {
    const [quickCheck, integrityCheck] = await Promise.all([
      this.tryRawQuery<Record<string, unknown>>('PRAGMA quick_check'),
      this.tryRawQuery<Record<string, unknown>>('PRAGMA integrity_check'),
    ]);

    if (quickCheck.error && integrityCheck.error) {
      return createUnavailableSection(
        'integrity',
        'Integrity',
        'Quick and full integrity checks',
        `${quickCheck.error} ${integrityCheck.error}`.trim(),
        capturedAt
      );
    }

    const quickCheckValue = this.firstRowValue(quickCheck.rows[0]);
    const integrityCheckValue = this.firstRowValue(integrityCheck.rows[0]);
    const quickOk = String(quickCheckValue || '').toLowerCase() === 'ok';
    const integrityOk =
      String(integrityCheckValue || '').toLowerCase() === 'ok';

    return {
      id: 'integrity',
      title: 'Integrity',
      subtitle: 'Quick and full integrity checks',
      status: 'ready',
      capturedAt,
      statusMessage: [quickCheck.error, integrityCheck.error]
        .filter(Boolean)
        .join(' '),
      cards: [
        {
          id: 'quick-check',
          label: 'Quick Check',
          value: formatValue(quickCheckValue),
          tone: quickOk ? 'success' : 'warning',
        },
        {
          id: 'integrity-check',
          label: 'Integrity Check',
          value: formatValue(integrityCheckValue),
          tone: integrityOk ? 'success' : 'warning',
        },
      ],
      checks: [
        {
          id: 'quick-check-result',
          label: 'Quick Check Result',
          detail: formatValue(quickCheckValue),
          status: quickOk ? 'pass' : 'warn',
          tone: quickOk ? 'success' : 'warning',
        },
        {
          id: 'integrity-check-result',
          label: 'Integrity Check Result',
          detail: formatValue(integrityCheckValue),
          status: integrityOk ? 'pass' : 'warn',
          tone: integrityOk ? 'success' : 'warning',
        },
      ],
      tables: [
        createTable({
          id: 'sqlite-integrity-results',
          title: 'Integrity Results',
          rows: [
            {
              check: 'quick_check',
              result: quickCheckValue,
            },
            {
              check: 'integrity_check',
              result: integrityCheckValue,
            },
          ],
        }),
      ],
    };
  }

  private async readPragmaEntry(name: string, sql: string) {
    const result = await this.tryRawQuery<Record<string, unknown>>(sql);

    return {
      name,
      value: result.rows[0] ? this.firstRowValue(result.rows[0]) : null,
      error: result.error,
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

  private firstRowValue(row: Record<string, unknown> | undefined): unknown {
    if (!row) {
      return null;
    }

    const firstKey = Object.keys(row)[0];
    return firstKey ? row[firstKey] : null;
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

  private describeAutoVacuum(value: unknown): string {
    switch (String(value ?? '')) {
      case '0':
        return 'None';
      case '1':
        return 'Full';
      case '2':
        return 'Incremental';
      default:
        return formatValue(value);
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
}
