import { describe, expect, it } from 'vitest';
import {
  formatFunctionDDL,
  generateRoutineUpdateSQL,
  generateDeleteSQL,
  generateDeleteUsingSQL,
  generateDropFunctionSQL,
  generateDropTableSQL,
  generateDropViewSQL,
  generateExportAsSQL,
  generateFunctionCallSQL,
  generateFunctionSelectSQL,
  generateInsertOnConflictSQL,
  generateInsertSQL,
  generateMergeSQL,
  generateRefreshMaterializedViewSQL,
  generateRenameFunctionSQL,
  generateRenameTableSQL,
  generateRenameViewSQL,
  generateSelectSQL,
  generateTableDDLTemplate,
  generateUpdateFromSQL,
  generateUpdateSQL,
  generateViewSelectSQL,
  getRoutineDefinitionType,
  getFormatParameters,
} from '~/components/modules/management/schemas/utils';

describe('schema SQL utils', () => {
  describe('generateFunctionCallSQL', () => {
    it.each([
      ['public', 'do_work', undefined, 'CALL "public"."do_work"();'],
      ['public', 'do_work', [], 'CALL "public"."do_work"();'],
      ['public', 'do_work', [':id'], 'CALL "public"."do_work"(:id);'],
      [
        'analytics',
        'sync_user',
        [':id', ':payload'],
        'CALL "analytics"."sync_user"(:id, :payload);',
      ],
      [
        'tenant-1',
        'refresh cache',
        [':force'],
        'CALL "tenant-1"."refresh cache"(:force);',
      ],
    ])('builds a CALL statement for %s.%s', (schema, name, args, expected) => {
      expect(generateFunctionCallSQL(schema, name, args)).toBe(expected);
    });
  });

  describe('generateFunctionSelectSQL', () => {
    it.each([
      [
        'public',
        'load_users',
        undefined,
        'SELECT * FROM "public"."load_users"();',
      ],
      ['public', 'load_users', [], 'SELECT * FROM "public"."load_users"();'],
      [
        'public',
        'load_users',
        [':limit'],
        'SELECT * FROM "public"."load_users"(:limit);',
      ],
      [
        'analytics',
        'report_users',
        [':from', ':to'],
        'SELECT * FROM "analytics"."report_users"(:from, :to);',
      ],
      [
        'tenant-1',
        'search users',
        [':term'],
        'SELECT * FROM "tenant-1"."search users"(:term);',
      ],
    ])(
      'builds a SELECT function statement for %s.%s',
      (schema, name, args, expected) => {
        expect(generateFunctionSelectSQL(schema, name, args)).toBe(expected);
      }
    );
  });

  describe('formatFunctionDDL', () => {
    it.each([
      [
        'CREATE FUNCTION test() RETURNS void AS $$ $$;',
        'CREATE FUNCTION test() RETURNS void AS $$ $$;',
      ],
      [
        '  CREATE FUNCTION test() RETURNS void AS $$ $$;  ',
        'CREATE FUNCTION test() RETURNS void AS $$ $$;',
      ],
      [
        '\nCREATE FUNCTION test()\nRETURNS void\n',
        'CREATE FUNCTION test()\nRETURNS void',
      ],
      ['', '-- Function definition not available'],
      ['   ', ''],
    ])('formats function DDL case %#', (input, expected) => {
      expect(formatFunctionDDL(input)).toBe(expected);
    });
  });

  describe('generateRoutineUpdateSQL', () => {
    it.each([
      [
        'CREATE OR REPLACE FUNCTION test() RETURNS void AS $$ $$ LANGUAGE sql',
        'CREATE OR REPLACE FUNCTION test() RETURNS void AS $$ $$ LANGUAGE sql;',
      ],
      [
        '  CREATE OR REPLACE PROCEDURE sync_data() LANGUAGE sql AS $$ $$;  ',
        'CREATE OR REPLACE PROCEDURE sync_data() LANGUAGE sql AS $$ $$;',
      ],
      ['', ''],
    ])('normalizes routine update SQL case %#', (input, expected) => {
      expect(generateRoutineUpdateSQL(input)).toBe(expected);
    });
  });

  describe('getRoutineDefinitionType', () => {
    it.each([
      [
        'CREATE OR REPLACE FUNCTION test() RETURNS void AS $$ $$ LANGUAGE sql;',
        'FUNCTION',
      ],
      ['create procedure sync_data() language sql as $$ $$;', 'PROCEDURE'],
      ['ALTER FUNCTION test() RENAME TO test2;', null],
    ])('detects routine definition types case %#', (input, expected) => {
      expect(getRoutineDefinitionType(input)).toBe(expected);
    });
  });

  describe('getFormatParameters', () => {
    it.each([
      [undefined, ''],
      ['', ''],
      ['IN user_id integer', 'user_id'],
      ['IN user_id integer, OUT payload jsonb', 'user_id, payload'],
      ['INOUT total numeric, VARIADIC tags text[]', 'total, tags'],
    ])('extracts parameter names case %#', (input, expected) => {
      expect(getFormatParameters(input)).toBe(expected);
    });
  });

  describe('generateDropFunctionSQL', () => {
    it.each([
      [
        'public',
        'archive_user',
        false,
        undefined,
        'DROP FUNCTION IF EXISTS "public"."archive_user"();',
      ],
      [
        'public',
        'archive_user',
        true,
        undefined,
        'DROP FUNCTION IF EXISTS "public"."archive_user"() CASCADE;',
      ],
      [
        'public',
        'archive_user',
        false,
        'IN user_id integer',
        'DROP FUNCTION IF EXISTS "public"."archive_user"(user_id);',
      ],
      [
        'analytics',
        'archive_user',
        true,
        'IN user_id integer, IN force boolean',
        'DROP FUNCTION IF EXISTS "analytics"."archive_user"(user_id, force) CASCADE;',
      ],
      [
        'tenant-1',
        'refresh cache',
        false,
        'IN force boolean',
        'DROP FUNCTION IF EXISTS "tenant-1"."refresh cache"(force);',
      ],
    ])(
      'builds a DROP FUNCTION statement case %#',
      (schema, name, cascade, parameters, expected) => {
        expect(generateDropFunctionSQL(schema, name, cascade, parameters)).toBe(
          expected
        );
      }
    );
  });

  describe('generateRenameFunctionSQL', () => {
    it.each([
      [
        'public',
        'old_name',
        'new_name',
        undefined,
        'ALTER FUNCTION "public"."old_name"() RENAME TO "new_name";',
      ],
      [
        'public',
        'old_name',
        'new_name',
        '',
        'ALTER FUNCTION "public"."old_name"() RENAME TO "new_name";',
      ],
      [
        'public',
        'old_name',
        'new_name',
        'IN user_id integer',
        'ALTER FUNCTION "public"."old_name"(user_id) RENAME TO "new_name";',
      ],
      [
        'analytics',
        'archive_user',
        'archive_account',
        'IN user_id integer, IN force boolean',
        'ALTER FUNCTION "analytics"."archive_user"(user_id, force) RENAME TO "archive_account";',
      ],
      [
        'tenant-1',
        'refresh cache',
        'refresh_cache',
        'IN force boolean',
        'ALTER FUNCTION "tenant-1"."refresh cache"(force) RENAME TO "refresh_cache";',
      ],
    ])(
      'builds an ALTER FUNCTION RENAME statement case %#',
      (schema, oldName, newName, parameters, expected) => {
        expect(
          generateRenameFunctionSQL(schema, oldName, newName, parameters)
        ).toBe(expected);
      }
    );
  });

  describe('generateSelectSQL', () => {
    it.each([
      [
        'public',
        'users',
        undefined,
        `SELECT *\nFROM "public"."users"\nWHERE 1=1\n-- Add your conditions here\nLIMIT 100;`,
      ],
      [
        'public',
        'users',
        [],
        `SELECT *\nFROM "public"."users"\nWHERE 1=1\n-- Add your conditions here\nLIMIT 100;`,
      ],
      [
        'public',
        'users',
        ['id'],
        `SELECT id\nFROM "public"."users"\nWHERE 1=1\n-- Add your conditions here\nLIMIT 100;`,
      ],
      [
        'analytics',
        'users',
        ['id', 'email'],
        `SELECT id, email\nFROM "analytics"."users"\nWHERE 1=1\n-- Add your conditions here\nLIMIT 100;`,
      ],
      [
        'tenant-1',
        'user events',
        ['"event_id"', '"user_id"'],
        `SELECT "event_id", "user_id"\nFROM "tenant-1"."user events"\nWHERE 1=1\n-- Add your conditions here\nLIMIT 100;`,
      ],
    ])(
      'builds a SELECT template case %#',
      (schema, table, columns, expected) => {
        expect(generateSelectSQL(schema, table, columns)).toBe(expected);
      }
    );
  });

  describe('generateInsertSQL', () => {
    it.each([
      [
        'public',
        'users',
        undefined,
        `INSERT INTO "public"."users" (column1, column2, ...)\nVALUES (value1, value2, ...);`,
      ],
      [
        'public',
        'users',
        [],
        `INSERT INTO "public"."users" (column1, column2, ...)\nVALUES (value1, value2, ...);`,
      ],
      [
        'public',
        'users',
        ['id'],
        `INSERT INTO "public"."users" (id)\nVALUES (?);`,
      ],
      [
        'analytics',
        'users',
        ['id', 'email'],
        `INSERT INTO "analytics"."users" (id, email)\nVALUES (?, ?);`,
      ],
      [
        'tenant-1',
        'user events',
        ['event_id', 'payload', 'created_at'],
        `INSERT INTO "tenant-1"."user events" (event_id, payload, created_at)\nVALUES (?, ?, ?);`,
      ],
    ])(
      'builds an INSERT template case %#',
      (schema, table, columns, expected) => {
        expect(generateInsertSQL(schema, table, columns)).toBe(expected);
      }
    );
  });

  describe('generateUpdateSQL', () => {
    it.each([
      [
        'public',
        'users',
        undefined,
        `UPDATE "public"."users"\nSET\n  column1 = value1,\n  column2 = value2\nWHERE 1=0; -- Add your WHERE clause (safety: 1=0 to prevent accidental updates)`,
      ],
      [
        'public',
        'users',
        [],
        `UPDATE "public"."users"\nSET\n  column1 = value1,\n  column2 = value2\nWHERE 1=0; -- Add your WHERE clause (safety: 1=0 to prevent accidental updates)`,
      ],
      [
        'public',
        'users',
        ['email'],
        `UPDATE "public"."users"\nSET\n  email = ?\nWHERE 1=0; -- Add your WHERE clause (safety: 1=0 to prevent accidental updates)`,
      ],
      [
        'analytics',
        'users',
        ['email', 'name'],
        `UPDATE "analytics"."users"\nSET\n  email = ?,\n  name = ?\nWHERE 1=0; -- Add your WHERE clause (safety: 1=0 to prevent accidental updates)`,
      ],
      [
        'tenant-1',
        'user events',
        ['payload', 'updated_at', 'status'],
        `UPDATE "tenant-1"."user events"\nSET\n  payload = ?,\n  updated_at = ?,\n  status = ?\nWHERE 1=0; -- Add your WHERE clause (safety: 1=0 to prevent accidental updates)`,
      ],
    ])(
      'builds an UPDATE template case %#',
      (schema, table, columns, expected) => {
        expect(generateUpdateSQL(schema, table, columns)).toBe(expected);
      }
    );
  });

  describe('generateDeleteSQL', () => {
    it.each([
      [
        'public',
        'users',
        `DELETE FROM "public"."users"\nWHERE 1=0; -- Add your WHERE clause (safety: 1=0 to prevent accidental deletes)`,
      ],
      [
        'analytics',
        'users',
        `DELETE FROM "analytics"."users"\nWHERE 1=0; -- Add your WHERE clause (safety: 1=0 to prevent accidental deletes)`,
      ],
      [
        'tenant-1',
        'user events',
        `DELETE FROM "tenant-1"."user events"\nWHERE 1=0; -- Add your WHERE clause (safety: 1=0 to prevent accidental deletes)`,
      ],
      [
        'reporting',
        'daily_metrics',
        `DELETE FROM "reporting"."daily_metrics"\nWHERE 1=0; -- Add your WHERE clause (safety: 1=0 to prevent accidental deletes)`,
      ],
      [
        'archive',
        'old_users',
        `DELETE FROM "archive"."old_users"\nWHERE 1=0; -- Add your WHERE clause (safety: 1=0 to prevent accidental deletes)`,
      ],
    ])('builds a DELETE template case %#', (schema, table, expected) => {
      expect(generateDeleteSQL(schema, table)).toBe(expected);
    });
  });

  describe('generateMergeSQL', () => {
    it.each([
      ['public', 'users'],
      ['analytics', 'users'],
      ['tenant-1', 'user events'],
      ['reporting', 'daily_metrics'],
      ['archive', 'old_users'],
    ])('builds a MERGE template for %s.%s', (schema, table) => {
      expect(generateMergeSQL(schema, table)).toBe(
        `MERGE INTO "${schema}"."${table}" AS target\nUSING (SELECT column1, column2 FROM source_table) AS source\nON target.id = source.id\nWHEN MATCHED THEN\n  UPDATE SET column1 = source.column1\nWHEN NOT MATCHED THEN\n  INSERT (column1, column2)\n  VALUES (source.column1, source.column2);`
      );
    });
  });

  describe('generateInsertOnConflictSQL', () => {
    it.each([
      [
        'public',
        'users',
        undefined,
        undefined,
        `INSERT INTO "public"."users" (column1, column2)\nVALUES (value1, value2)\nON CONFLICT (id)\nDO UPDATE SET\n    column1 = EXCLUDED.column1;`,
      ],
      [
        'public',
        'users',
        [],
        [],
        `INSERT INTO "public"."users" (column1, column2)\nVALUES (value1, value2)\nON CONFLICT (id)\nDO UPDATE SET\n    column1 = EXCLUDED.column1;`,
      ],
      [
        'public',
        'users',
        ['id'],
        ['id'],
        `INSERT INTO "public"."users" (id)\nVALUES (?)\nON CONFLICT (id)\nDO UPDATE SET\n    id = EXCLUDED.id;`,
      ],
      [
        'analytics',
        'users',
        ['id', 'email'],
        ['id'],
        `INSERT INTO "analytics"."users" (id, email)\nVALUES (?, ?)\nON CONFLICT (id)\nDO UPDATE SET\n    id = EXCLUDED.id,\n    email = EXCLUDED.email;`,
      ],
      [
        'tenant-1',
        'user events',
        ['event_id', 'status', 'payload'],
        ['event_id', 'status'],
        `INSERT INTO "tenant-1"."user events" (event_id, status, payload)\nVALUES (?, ?, ?)\nON CONFLICT (event_id, status)\nDO UPDATE SET\n    event_id = EXCLUDED.event_id,\n    status = EXCLUDED.status,\n    payload = EXCLUDED.payload;`,
      ],
    ])(
      'builds an INSERT ON CONFLICT template case %#',
      (schema, table, columns, conflictColumns, expected) => {
        expect(
          generateInsertOnConflictSQL(schema, table, columns, conflictColumns)
        ).toBe(expected);
      }
    );
  });

  describe('generateUpdateFromSQL', () => {
    it.each([
      ['public', 'users'],
      ['analytics', 'users'],
      ['tenant-1', 'user events'],
      ['reporting', 'daily_metrics'],
      ['archive', 'old_users'],
    ])('builds an UPDATE FROM template for %s.%s', (schema, table) => {
      expect(generateUpdateFromSQL(schema, table)).toBe(
        `UPDATE "${schema}"."${table}" AS t\nSET column1 = s.column1\nFROM source_table AS s\nWHERE t.id = s.id;`
      );
    });
  });

  describe('generateDeleteUsingSQL', () => {
    it.each([
      ['public', 'users'],
      ['analytics', 'users'],
      ['tenant-1', 'user events'],
      ['reporting', 'daily_metrics'],
      ['archive', 'old_users'],
    ])('builds a DELETE USING template for %s.%s', (schema, table) => {
      expect(generateDeleteUsingSQL(schema, table)).toBe(
        `DELETE FROM "${schema}"."${table}" AS t\nUSING source_table AS s\nWHERE t.id = s.id;`
      );
    });
  });

  describe('generateTableDDLTemplate', () => {
    it.each([
      ['public', 'users'],
      ['analytics', 'users'],
      ['tenant-1', 'user events'],
      ['reporting', 'daily_metrics'],
      ['archive', 'old_users'],
    ])('builds a table DDL template for %s.%s', (schema, table) => {
      expect(generateTableDDLTemplate(schema, table)).toBe(
        `-- DDL for ${schema}.${table}\n-- Use 'Get Table Structure' API for actual DDL\nCREATE TABLE "${schema}"."${table}" (\n  id SERIAL PRIMARY KEY,\n  column1 VARCHAR(255),\n  column2 INTEGER,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);`
      );
    });
  });

  describe('generateExportAsSQL', () => {
    it('returns a no-data comment when the input is empty', () => {
      expect(generateExportAsSQL('public', 'users', [])).toBe(
        '-- No data to export from public.users'
      );
    });

    it('exports numbers and strings', () => {
      expect(
        generateExportAsSQL('public', 'users', [{ id: 1, name: 'Jane' }])
      ).toBe(`INSERT INTO "public"."users" ("id", "name") VALUES (1, 'Jane');`);
    });

    it('escapes single quotes in string values', () => {
      expect(generateExportAsSQL('public', 'users', [{ name: "O'Hara" }])).toBe(
        `INSERT INTO "public"."users" ("name") VALUES ('O''Hara');`
      );
    });

    it('exports booleans, null, and undefined values', () => {
      expect(
        generateExportAsSQL('public', 'users', [
          { active: true, disabled: false, note: null, extra: undefined },
        ])
      ).toBe(
        `INSERT INTO "public"."users" ("active", "disabled", "note", "extra") VALUES (true, false, NULL, NULL);`
      );
    });

    it('exports multiple rows using the first row column order', () => {
      expect(
        generateExportAsSQL('public', 'users', [
          { id: 1, name: 'Jane' },
          { id: 2, name: 'John', ignored: 'value' },
        ])
      ).toBe(
        `INSERT INTO "public"."users" ("id", "name") VALUES (1, 'Jane');\nINSERT INTO "public"."users" ("id", "name") VALUES (2, 'John');`
      );
    });
  });

  describe('generateDropTableSQL', () => {
    it.each([
      ['public', 'users', false, 'DROP TABLE IF EXISTS "public"."users";'],
      [
        'public',
        'users',
        true,
        'DROP TABLE IF EXISTS "public"."users" CASCADE;',
      ],
      [
        'analytics',
        'users',
        false,
        'DROP TABLE IF EXISTS "analytics"."users";',
      ],
      [
        'tenant-1',
        'user events',
        true,
        'DROP TABLE IF EXISTS "tenant-1"."user events" CASCADE;',
      ],
      [
        'archive',
        'old_users',
        false,
        'DROP TABLE IF EXISTS "archive"."old_users";',
      ],
    ])(
      'builds a DROP TABLE statement case %#',
      (schema, table, cascade, expected) => {
        expect(generateDropTableSQL(schema, table, cascade)).toBe(expected);
      }
    );
  });

  describe('generateRenameTableSQL', () => {
    it.each([
      [
        'public',
        'users',
        'accounts',
        'ALTER TABLE "public"."users" RENAME TO "accounts";',
      ],
      [
        'analytics',
        'users',
        'analytics_users',
        'ALTER TABLE "analytics"."users" RENAME TO "analytics_users";',
      ],
      [
        'tenant-1',
        'user events',
        'user_events_archive',
        'ALTER TABLE "tenant-1"."user events" RENAME TO "user_events_archive";',
      ],
      [
        'reporting',
        'daily_metrics',
        'hourly_metrics',
        'ALTER TABLE "reporting"."daily_metrics" RENAME TO "hourly_metrics";',
      ],
      [
        'archive',
        'old_users',
        'users_2024',
        'ALTER TABLE "archive"."old_users" RENAME TO "users_2024";',
      ],
    ])(
      'builds an ALTER TABLE RENAME statement case %#',
      (schema, oldName, newName, expected) => {
        expect(generateRenameTableSQL(schema, oldName, newName)).toBe(expected);
      }
    );
  });

  describe('generateDropViewSQL', () => {
    it.each([
      [
        'public',
        'user_view',
        false,
        false,
        'DROP VIEW IF EXISTS "public"."user_view";',
      ],
      [
        'public',
        'user_view',
        false,
        true,
        'DROP VIEW IF EXISTS "public"."user_view" CASCADE;',
      ],
      [
        'public',
        'user_mv',
        true,
        false,
        'DROP MATERIALIZED VIEW IF EXISTS "public"."user_mv";',
      ],
      [
        'analytics',
        'user_mv',
        true,
        true,
        'DROP MATERIALIZED VIEW IF EXISTS "analytics"."user_mv" CASCADE;',
      ],
      [
        'tenant-1',
        'user events view',
        false,
        false,
        'DROP VIEW IF EXISTS "tenant-1"."user events view";',
      ],
    ])(
      'builds a DROP VIEW statement case %#',
      (schema, view, isMaterialized, cascade, expected) => {
        expect(generateDropViewSQL(schema, view, isMaterialized, cascade)).toBe(
          expected
        );
      }
    );
  });

  describe('generateRenameViewSQL', () => {
    it.each([
      [
        'public',
        'user_view',
        'account_view',
        false,
        'ALTER VIEW "public"."user_view" RENAME TO "account_view";',
      ],
      [
        'public',
        'user_mv',
        'account_mv',
        true,
        'ALTER MATERIALIZED VIEW "public"."user_mv" RENAME TO "account_mv";',
      ],
      [
        'analytics',
        'daily_view',
        'daily_view_v2',
        false,
        'ALTER VIEW "analytics"."daily_view" RENAME TO "daily_view_v2";',
      ],
      [
        'analytics',
        'daily_mv',
        'daily_mv_v2',
        true,
        'ALTER MATERIALIZED VIEW "analytics"."daily_mv" RENAME TO "daily_mv_v2";',
      ],
      [
        'tenant-1',
        'user events view',
        'user_events_view_archive',
        false,
        'ALTER VIEW "tenant-1"."user events view" RENAME TO "user_events_view_archive";',
      ],
    ])(
      'builds an ALTER VIEW RENAME statement case %#',
      (schema, oldName, newName, isMaterialized, expected) => {
        expect(
          generateRenameViewSQL(schema, oldName, newName, isMaterialized)
        ).toBe(expected);
      }
    );
  });

  describe('generateRefreshMaterializedViewSQL', () => {
    it.each([
      [
        'public',
        'user_mv',
        false,
        'REFRESH MATERIALIZED VIEW "public"."user_mv";',
      ],
      [
        'public',
        'user_mv',
        true,
        'REFRESH MATERIALIZED VIEW CONCURRENTLY "public"."user_mv";',
      ],
      [
        'analytics',
        'daily_mv',
        false,
        'REFRESH MATERIALIZED VIEW "analytics"."daily_mv";',
      ],
      [
        'analytics',
        'daily_mv',
        true,
        'REFRESH MATERIALIZED VIEW CONCURRENTLY "analytics"."daily_mv";',
      ],
      [
        'tenant-1',
        'user events mv',
        false,
        'REFRESH MATERIALIZED VIEW "tenant-1"."user events mv";',
      ],
    ])(
      'builds a REFRESH MATERIALIZED VIEW statement case %#',
      (schema, view, concurrently, expected) => {
        expect(
          generateRefreshMaterializedViewSQL(schema, view, concurrently)
        ).toBe(expected);
      }
    );
  });

  describe('generateViewSelectSQL', () => {
    it.each([
      [
        'public',
        'user_view',
        undefined,
        `SELECT *\nFROM "public"."user_view"\nWHERE 1=1\n-- Add your conditions here\nLIMIT 100;`,
      ],
      [
        'public',
        'user_view',
        [],
        `SELECT *\nFROM "public"."user_view"\nWHERE 1=1\n-- Add your conditions here\nLIMIT 100;`,
      ],
      [
        'public',
        'user_view',
        ['id'],
        `SELECT "id"\nFROM "public"."user_view"\nWHERE 1=1\n-- Add your conditions here\nLIMIT 100;`,
      ],
      [
        'analytics',
        'user_view',
        ['id', 'email'],
        `SELECT "id", "email"\nFROM "analytics"."user_view"\nWHERE 1=1\n-- Add your conditions here\nLIMIT 100;`,
      ],
      [
        'tenant-1',
        'user events view',
        ['event_id', 'created_at'],
        `SELECT "event_id", "created_at"\nFROM "tenant-1"."user events view"\nWHERE 1=1\n-- Add your conditions here\nLIMIT 100;`,
      ],
    ])(
      'builds a view SELECT template case %#',
      (schema, view, columns, expected) => {
        expect(generateViewSelectSQL(schema, view, columns)).toBe(expected);
      }
    );
  });
});
