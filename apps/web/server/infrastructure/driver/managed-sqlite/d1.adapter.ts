import type { Knex } from 'knex';
import { Readable } from 'node:stream';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  EConnectionProviderKind,
  type IManagedSqliteConfig,
} from '~/core/types/entities/connection.entity';
import { BaseDatabaseAdapter } from '../base.adapter';
import type { RawQueryResult } from '../types';
import {
  createManagedSqliteConnectionString,
  createManagedSqliteKnex,
  createSyntheticFields,
  inferSqliteCommand,
  normalizeRecordRows,
  rowsToArray,
} from './index';

type D1StatementResult = {
  success?: boolean;
  results?: Record<string, unknown>[];
  meta?: {
    changes?: number;
    duration?: number;
    last_row_id?: number | null;
    served_by?: string;
    size_after?: number;
    rows_read?: number;
    rows_written?: number;
  };
};

type D1Response = {
  success?: boolean;
  errors?: Array<{ code?: number; message?: string }>;
  messages?: Array<{ code?: number; message?: string }>;
  result?: D1StatementResult[];
};

export class D1Adapter extends BaseDatabaseAdapter {
  private readonly managedSqlite: IManagedSqliteConfig;

  constructor(managedSqlite: IManagedSqliteConfig) {
    super(
      DatabaseClientType.SQLITE3,
      createManagedSqliteConnectionString(
        EConnectionProviderKind.CLOUDFLARE_D1,
        managedSqlite
      ),
      createManagedSqliteKnex()
    );

    this.managedSqlite = managedSqlite;
  }

  private get endpoint() {
    if (!this.managedSqlite.accountId || !this.managedSqlite.databaseId) {
      throw new Error('Cloudflare D1 requires both accountId and databaseId.');
    }

    return `https://api.cloudflare.com/client/v4/accounts/${this.managedSqlite.accountId}/d1/database/${this.managedSqlite.databaseId}/query`;
  }

  private get headers() {
    if (!this.managedSqlite.apiToken) {
      throw new Error('Cloudflare D1 requires an API token.');
    }

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.managedSqlite.apiToken}`,
    };
  }

  private async executeStatement(
    sql: string,
    bindings: any[] = []
  ): Promise<D1StatementResult> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        sql,
        params: bindings,
      }),
    });

    const payload = (await response.json()) as D1Response;

    const message = payload.errors?.[0]?.message;

    if (!response.ok || payload.success === false) {
      throw new Error(
        message ||
          `Cloudflare D1 request failed with status ${response.status}.`
      );
    }

    const result = payload.result?.[0];

    if (!result || result.success === false) {
      throw new Error(message || 'Cloudflare D1 query failed.');
    }

    return result;
  }

  protected async _rawQuery<T = any>(
    sql: string,
    bindings: any[] = []
  ): Promise<T[]> {
    const result = await this.executeStatement(sql, bindings);

    return normalizeRecordRows(result.results || []) as T[];
  }

  protected async _rawOut<T = any>(
    sql: string,
    bindings: any[] = []
  ): Promise<RawQueryResult<T>> {
    const result = await this.executeStatement(sql, bindings);
    const rows = normalizeRecordRows(result.results || []);
    const fields = createSyntheticFields(Object.keys(rows[0] || {}));
    const rowCount =
      rows.length > 0 ? rows.length : (result.meta?.changes ?? 0);

    return {
      rows: rowsToArray<T>(rows, fields),
      fields,
      rowCount,
      command: inferSqliteCommand(sql),
    };
  }

  protected _streamQuery(
    sql: string,
    bindings: any[] = [],
    _options: Record<string, any> = {}
  ): Readable {
    const adapter = this;

    return Readable.from(
      (async function* () {
        const rows = await adapter._rawQuery<Record<string, unknown>>(
          sql,
          bindings
        );

        for (const row of rows) {
          yield row;
        }
      })()
    );
  }

  protected _getNativeSql(
    sql: string,
    bindings: Knex.RawBinding
  ): Knex.SqlNative {
    return this.knex.raw(sql, bindings).toSQL().toNative();
  }

  override async healthCheck(): Promise<boolean> {
    try {
      await this.executeStatement('SELECT 1 AS health_check');
      return true;
    } catch (error) {
      console.error('[D1Adapter] Health check failed', error);
      return false;
    }
  }
}
