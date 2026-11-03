import { describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { SchemaColumnMetadata, SchemaMetaData } from '~/core/types';
import { computeSchemaDiff } from '~/server/utils/schema-diff.utils';

const column = (
  name: string,
  type: string,
  overrides: Partial<SchemaColumnMetadata> = {}
): SchemaColumnMetadata => ({
  name,
  type,
  short_type_name: type,
  ordinal_position: 1,
  is_nullable: true,
  default_value: null,
  ...overrides,
});

const schema = (
  tables: Record<string, SchemaColumnMetadata[]>
): SchemaMetaData => ({
  name: 'app',
  tables: Object.keys(tables),
  views: [],
  functions: [],
  view_details: {},
  table_details: Object.fromEntries(
    Object.entries(tables).map(([name, columns]) => [
      name,
      { columns, foreign_keys: [], primary_keys: [], table_id: name },
    ])
  ),
});

const statements = (
  source: SchemaMetaData,
  target: SchemaMetaData,
  dbType?: DatabaseClientType
) =>
  computeSchemaDiff([source], [target], false, dbType).sql.statements.map(
    statement => statement.sql
  );

describe('schema diff SQL per engine', () => {
  const source = schema({
    users: [
      column('id', 'int', { is_nullable: false }),
      column('email', 'nvarchar(100)', {
        is_nullable: false,
        default_value: "('x')",
      }),
    ],
  });
  const target = schema({ users: [column('id', 'bigint')] });

  it('uses T-SQL syntax for SQL Server targets', () => {
    expect(statements(source, target, DatabaseClientType.MSSQL)).toEqual([
      "ALTER TABLE [app].[users] ADD [email] nvarchar(100) DEFAULT ('x') NOT NULL;",
      'ALTER TABLE [app].[users] ALTER COLUMN [id] int NOT NULL;',
      'ALTER TABLE [app].[users] ALTER COLUMN [id] int NOT NULL;',
    ]);
  });

  it('uses MODIFY and parenthesised ADD for Oracle targets', () => {
    expect(statements(source, target, DatabaseClientType.ORACLE)).toEqual([
      `ALTER TABLE "app"."users" ADD ("email" nvarchar(100) DEFAULT ('x') NOT NULL);`,
      `ALTER TABLE "app"."users" MODIFY ("id" int);`,
      `ALTER TABLE "app"."users" MODIFY ("id" NOT NULL);`,
    ]);
  });

  it('keeps Postgres syntax for CockroachDB targets', () => {
    expect(statements(source, target, DatabaseClientType.COCKROACHDB)).toEqual([
      `ALTER TABLE "app"."users" ADD COLUMN "email" nvarchar(100) DEFAULT ('x') NOT NULL;`,
      `ALTER TABLE "app"."users" ALTER COLUMN "id" TYPE int;`,
      `ALTER TABLE "app"."users" ALTER COLUMN "id" SET NOT NULL;`,
    ]);
  });

  it('omits IF [NOT] EXISTS where the engine lacks it', () => {
    const empty = schema({});
    const [create] = statements(source, empty, DatabaseClientType.ORACLE);
    const [drop] = statements(empty, source, DatabaseClientType.ORACLE);

    expect(create).toMatch(/^CREATE TABLE "app"\."users" \(/);
    expect(drop).toBe('DROP TABLE "app"."users";');
    expect(statements(source, empty, DatabaseClientType.MSSQL)[0]).toMatch(
      /^CREATE TABLE \[app\]\.\[users\] \(/
    );
  });
});
