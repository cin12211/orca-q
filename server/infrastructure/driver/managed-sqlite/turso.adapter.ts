import { createClient, type Client } from '@libsql/client';
import type { Knex } from 'knex';
import { Readable } from 'node:stream';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { IManagedSqliteConfig } from '~/core/types/entities/connection.entity';
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

type LibsqlExecuteResult = {
  rows?: Array<Record<string, unknown> | null | undefined>;
  columns?: string[];
  rowsAffected?: number;
};

export class TursoAdapter extends BaseDatabaseAdapter {
  private readonly client: Client;

  constructor(private readonly managedSqlite: IManagedSqliteConfig) {
    super(
      DatabaseClientType.SQLITE3,
      createManagedSqliteConnectionString('turso' as never, managedSqlite),
      createManagedSqliteKnex()
    );

    if (!managedSqlite.url) {
      throw new Error('Turso requires a database URL.');
    }

    if (!managedSqlite.authToken) {
      throw new Error('Turso requires an auth token.');
    }

    this.client = createClient({
      url: createManagedSqliteConnectionString('turso' as never, managedSqlite),
      authToken: managedSqlite.authToken,
    });
  }

  private async executeStatement(
    sql: string,
    bindings: any[] = []
  ): Promise<LibsqlExecuteResult> {
    return (await this.client.execute({
      sql,
      args: bindings,
    })) as LibsqlExecuteResult;
  }

  protected async _rawQuery<T = any>(
    sql: string,
    bindings: any[] = []
  ): Promise<T[]> {
    const result = await this.executeStatement(sql, bindings);

    return normalizeRecordRows(result.rows || []) as T[];
  }

  protected async _rawOut<T = any>(
    sql: string,
    bindings: any[] = []
  ): Promise<RawQueryResult<T>> {
    const result = await this.executeStatement(sql, bindings);
    const rows = normalizeRecordRows(result.rows || []);
    const fields = createSyntheticFields(
      result.columns?.length ? result.columns : Object.keys(rows[0] || {})
    );

    return {
      rows: rowsToArray<T>(rows, fields),
      fields,
      rowCount: result.rowsAffected ?? rows.length,
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
      console.error('[TursoAdapter] Health check failed', error);
      return false;
    }
  }

  override async destroy(): Promise<void> {
    this.client.close();
    await super.destroy();
  }
}
