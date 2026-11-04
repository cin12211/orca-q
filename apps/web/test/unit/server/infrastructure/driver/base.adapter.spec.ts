import type { Knex } from 'knex';
import { describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { maskNamedBindParametersInComments } from '~/server/infrastructure/agent/core/sql';
import { BaseDatabaseAdapter } from '~/server/infrastructure/driver/base.adapter';
import type { RawQueryResult } from '~/server/infrastructure/driver/types';

class TestDatabaseAdapter extends BaseDatabaseAdapter {
  public lastRawQuery: { sql: string; bindings: any[] } | null = null;
  public lastRawOut: { sql: string; bindings: any[] } | null = null;
  public lastNativeSql: { sql: string; bindings: Knex.RawBinding } | null =
    null;

  constructor() {
    super(DatabaseClientType.POSTGRES, 'postgres://example', {} as Knex);
  }

  protected async _rawQuery<T = any>(
    sql: string,
    bindings: any[]
  ): Promise<T[]> {
    this.lastRawQuery = { sql, bindings };
    return [];
  }

  protected async _rawOut<T = any>(
    sql: string,
    bindings: any[]
  ): Promise<RawQueryResult<T>> {
    this.lastRawOut = { sql, bindings };
    return {
      rows: [],
      fields: [],
      rowCount: 0,
      command: 'SELECT',
    };
  }

  protected _streamQuery(): never {
    throw new Error('Not implemented in test adapter');
  }

  protected _getNativeSql(
    sql: string,
    bindings: Knex.RawBinding
  ): Knex.SqlNative {
    this.lastNativeSql = { sql, bindings };
    return {
      sql,
      bindings: Array.isArray(bindings) ? bindings : [],
    } as Knex.SqlNative;
  }
}

describe('maskNamedBindParametersInComments', () => {
  it('masks named bind placeholders inside SQL comments only', () => {
    const sql = `select * from users -- :demo\nwhere id = :id /* :hidden */ and note = ':literal'`;

    expect(maskNamedBindParametersInComments(sql)).toBe(
      "select * from users -- __heraq_comment_bind_demo__\nwhere id = :id /* __heraq_comment_bind_hidden__ */ and note = ':literal'"
    );
  });
});

describe('BaseDatabaseAdapter named bindings', () => {
  it('sanitizes comment-only named placeholders before raw execution', async () => {
    const adapter = new TestDatabaseAdapter();
    const sql = 'select * from users -- :ignored\nwhere id = :id';

    await adapter.rawOut(sql, { id: 1 } as any);

    expect(adapter.lastRawOut?.sql).toContain(
      '-- __heraq_comment_bind_ignored__'
    );
    expect(adapter.lastRawOut?.sql).toContain('where id = :id');
  });

  it('keeps positional bindings unchanged', async () => {
    const adapter = new TestDatabaseAdapter();
    const sql = 'select * from users -- :ignored\nwhere id = ?';

    await adapter.rawQuery(sql, [1] as any);

    expect(adapter.lastRawQuery?.sql).toBe(sql);
  });

  it('sanitizes comment-only named placeholders before native SQL conversion', () => {
    const adapter = new TestDatabaseAdapter();
    const sql = 'select * from users /* :ignored */ where id = :id';

    adapter.getNativeSql(sql, { id: 1 });

    expect(adapter.lastNativeSql?.sql).toBe(
      'select * from users /* __heraq_comment_bind_ignored__ */ where id = :id'
    );
  });
});
