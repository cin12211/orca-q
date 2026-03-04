import type {
  TableIndex,
  RLSPolicy,
  RLSStatus,
  TableRule,
  TableTrigger,
} from '~/core/types';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';

export class PostgresTableAdvancedObjectsAdapter {
  constructor(private readonly adapter: IDatabaseAdapter) {}

  private parsePolicyRoles(rawRoles: unknown): string[] {
    if (Array.isArray(rawRoles)) {
      return rawRoles.map(role => String(role));
    }

    if (typeof rawRoles !== 'string') {
      return [];
    }

    const value = rawRoles.trim();
    if (!value) return [];

    // Postgres text[] often comes as "{role_a,role_b}" depending on driver parser.
    const normalized =
      value.startsWith('{') && value.endsWith('}') ? value.slice(1, -1) : value;

    if (!normalized) return [];

    return normalized
      .split(',')
      .map(role => role.trim().replace(/^"|"$/g, ''))
      .filter(Boolean);
  }

  async getTableIndexes(
    schema: string,
    tableName: string
  ): Promise<TableIndex[]> {
    const query = `
      SELECT
        i.relname AS index_name,
        ix.indisunique AS is_unique,
        ix.indisprimary AS is_primary,
        am.amname AS method,
        pg_get_indexdef(ix.indexrelid) AS definition
      FROM pg_class t
      JOIN pg_namespace n ON t.relnamespace = n.oid
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_am am ON i.relam = am.oid
      WHERE t.relname = ?
        AND n.nspname = ?
      ORDER BY i.relname;
    `;

    const rows = await this.adapter.rawQuery(query, [tableName, schema]);

    return rows.map(
      (row: Record<string, unknown>): TableIndex => ({
        indexName: row.index_name as string,
        isUnique: row.is_unique as boolean,
        isPrimary: row.is_primary as boolean,
        method: row.method as string,
        definition: row.definition as string,
      })
    );
  }

  async getTableRlsStatus(
    schema: string,
    tableName: string
  ): Promise<RLSStatus> {
    const query = `
      SELECT c.relrowsecurity AS enabled
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE c.relname = ?
        AND n.nspname = ?;
    `;

    const rows = await this.adapter.rawQuery(query, [tableName, schema]);
    const row = rows?.[0];

    return {
      enabled: row?.enabled ?? false,
    };
  }

  async getTableRlsPolicies(
    schema: string,
    tableName: string
  ): Promise<RLSPolicy[]> {
    const query = `
      SELECT
        policyname,
        permissive,
        cmd AS command,
        roles,
        qual AS using_expression,
        with_check AS with_check_expression
      FROM pg_policies
      WHERE schemaname = ?
        AND tablename = ?
      ORDER BY policyname;
    `;

    const rows = await this.adapter.rawQuery(query, [schema, tableName]);

    return rows.map(
      (row: Record<string, unknown>): RLSPolicy => ({
        policyName: row.policyname as string,
        permissive: row.permissive as string,
        command: row.command as string,
        roles: this.parsePolicyRoles(row.roles),
        usingExpression: (row.using_expression as string) ?? null,
        withCheckExpression: (row.with_check_expression as string) ?? null,
      })
    );
  }

  async getTableRules(schema: string, tableName: string): Promise<TableRule[]> {
    const query = `
      SELECT
        r.rulename,
        r.ev_type,
        r.is_instead,
        pg_get_ruledef(r.oid) AS definition
      FROM pg_rewrite r
      JOIN pg_class c ON r.ev_class = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE c.relname = ?
        AND n.nspname = ?
        AND r.rulename != '_RETURN'
      ORDER BY r.rulename;
    `;

    const rows = await this.adapter.rawQuery(query, [tableName, schema]);

    const eventMap: Record<string, string> = {
      '1': 'SELECT',
      '2': 'UPDATE',
      '3': 'INSERT',
      '4': 'DELETE',
    };

    return rows.map(
      (row: Record<string, unknown>): TableRule => ({
        ruleName: row.rulename as string,
        event: eventMap[String(row.ev_type)] ?? String(row.ev_type),
        actionType: row.is_instead ? 'INSTEAD' : 'ALSO',
        definition: row.definition as string,
      })
    );
  }

  async getTableTriggers(
    schema: string,
    tableName: string
  ): Promise<TableTrigger[]> {
    const query = `
      SELECT
        tg.tgname AS trigger_name,
        pg_get_triggerdef(tg.oid) AS definition,
        tg.tgenabled AS enabled_mode,
        CASE
          WHEN (tg.tgtype & 2) = 2 THEN 'BEFORE'
          WHEN (tg.tgtype & 64) = 64 THEN 'INSTEAD OF'
          ELSE 'AFTER'
        END AS timing,
        ARRAY_REMOVE(
          ARRAY[
            CASE WHEN (tg.tgtype & 4) = 4 THEN 'INSERT' END,
            CASE WHEN (tg.tgtype & 8) = 8 THEN 'DELETE' END,
            CASE WHEN (tg.tgtype & 16) = 16 THEN 'UPDATE' END,
            CASE WHEN (tg.tgtype & 32) = 32 THEN 'TRUNCATE' END
          ],
          NULL
        ) AS events,
        CASE
          WHEN (tg.tgtype & 1) = 1 THEN 'FOR EACH ROW'
          ELSE 'FOR EACH STATEMENT'
        END AS orientation
      FROM pg_trigger tg
      JOIN pg_class c ON tg.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE c.relname = ?
        AND n.nspname = ?
        AND NOT tg.tgisinternal
      ORDER BY tg.tgname;
    `;

    const rows = await this.adapter.rawQuery(query, [tableName, schema]);

    return rows.map(
      (row: Record<string, unknown>): TableTrigger => ({
        triggerName: row.trigger_name as string,
        enabled: (row.enabled_mode as string) !== 'D',
        timing: row.timing as string,
        events: Array.isArray(row.events)
          ? (row.events as string[]).map(event => String(event))
          : [],
        orientation: row.orientation as string,
        definition: row.definition as string,
      })
    );
  }
}
