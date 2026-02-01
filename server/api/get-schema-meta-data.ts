import { getDatabaseSource } from '~/server/utils/db-connection';
import { FunctionSchemaEnum } from '~/shared/types';

export interface ColumnShortMetadata {
  name: string;
  ordinal_position: number;
  type: string;
  short_type_name: string;
  is_nullable: boolean;
  default_value: string | null;
}

export interface ForeignKeyMetadata {
  column: string;
  referenced_column: string;
  referenced_table: string;
  referenced_table_schema: string;
}

interface PrimaryKey {
  column: string;
}

export interface TableDetailMetadata {
  columns: ColumnShortMetadata[];
  foreign_keys: ForeignKeyMetadata[];
  primary_keys: PrimaryKey[];
  table_id: string;
}

export interface TableDetails {
  [tableName: string]: TableDetailMetadata;
}

export interface FunctionSchema {
  oId: string;
  name: string;
  type: FunctionSchemaEnum;
  parameters: string;
}

export interface SchemaMetaData {
  name: string;
  tables: string[] | null;
  views: string[] | null;
  functions: FunctionSchema[] | null;
  table_details: TableDetails | null;
}

interface RequestBody {
  dbConnectionString: string;
}

export default defineEventHandler(async (event): Promise<SchemaMetaData[]> => {
  const body: RequestBody = await readBody(event);

  const resource = await getDatabaseSource({
    dbConnectionString: body.dbConnectionString,
    type: 'postgres',
  });

  const result = await resource.query(`
    SELECT
      nsp.nspname AS name,
      -- tables
      (
        SELECT json_agg(table_name)
        FROM information_schema.tables t
        WHERE t.table_schema = nsp.nspname
          AND t.table_type = 'BASE TABLE'
      ) AS tables,
      -- views
      (
        SELECT json_agg(table_name)
        FROM information_schema.tables t
        WHERE t.table_schema = nsp.nspname
          AND t.table_type = 'VIEW'
      ) AS views,
      -- functions
      (
       SELECT JSON_AGG(
          JSONB_BUILD_OBJECT(
            'name',
            routine_name,
            'oId',
            p.oid,
            'type',
            routine_type,
            'parameters',
            PG_GET_FUNCTION_ARGUMENTS(p.oid),
            'schema',
            r.specific_schema
          )
        )
        FROM information_schema.routines r
        JOIN pg_proc p ON p.proname = r.routine_name
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE r.routine_schema = nsp.nspname
          AND r.specific_schema NOT IN ('pg_catalog', 'information_schema')
          AND n.nspname = r.specific_schema
      ) AS functions,
      -- table_details
      (
        SELECT json_object_agg(
          t.table_name,
          json_build_object(
            'table_id', pc.oid,
            'columns', (
              SELECT json_agg(
                json_build_object(
                  'name', a.attname,
                  'ordinal_position', a.attnum,
                  'type', format_type(a.atttypid, a.atttypmod),
                  'is_nullable', NOT a.attnotnull,
                  'default_value', pg_get_expr(d.adbin, d.adrelid),
                  'short_type_name',
                  CASE
                    WHEN format_type(a.atttypid, a.atttypmod) LIKE 'character varying%' 
                        THEN REPLACE(format_type(a.atttypid, a.atttypmod), 'character varying', 'varchar')
                    WHEN format_type(a.atttypid, a.atttypmod) LIKE 'character%' 
                        THEN REPLACE(format_type(a.atttypid, a.atttypmod), 'character', 'char')
                    WHEN format_type(a.atttypid, a.atttypmod) = 'double precision' THEN 'float8'
                    WHEN format_type(a.atttypid, a.atttypmod) = 'integer' THEN 'int4'
                    WHEN format_type(a.atttypid, a.atttypmod) = 'smallint' THEN 'int2'
                    WHEN format_type(a.atttypid, a.atttypmod) = 'bigint' THEN 'int8'
                    WHEN format_type(a.atttypid, a.atttypmod) = 'real' THEN 'float4'
                    WHEN format_type(a.atttypid, a.atttypmod) = 'serial' THEN 'serial4'
                    WHEN format_type(a.atttypid, a.atttypmod) = 'smallserial' THEN 'serial2'
                    WHEN format_type(a.atttypid, a.atttypmod) = 'bigserial' THEN 'serial8'
                    WHEN format_type(a.atttypid, a.atttypmod) LIKE 'bit varying%' 
                        THEN REPLACE(format_type(a.atttypid, a.atttypmod), 'bit varying', 'varbit')
                    WHEN format_type(a.atttypid, a.atttypmod) = 'boolean' THEN 'bool'
                    WHEN format_type(a.atttypid, a.atttypmod) LIKE 'numeric%' 
                    THEN REPLACE(format_type(a.atttypid, a.atttypmod), 'numeric', 'decimal')
                    WHEN format_type(a.atttypid, a.atttypmod) = 'timestamp with time zone' THEN 'timestamptz'
                    WHEN format_type(a.atttypid, a.atttypmod) = 'timestamp without time zone' THEN 'timestamp'
                    WHEN format_type(a.atttypid, a.atttypmod) = 'time with time zone' THEN 'timetz'
                    ELSE format_type(a.atttypid, a.atttypmod)
                  END -- short type with length, user-friendly 
                )
              )
              FROM pg_attribute a
              LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
              WHERE a.attrelid = pc.oid
                AND a.attnum > 0
                AND NOT a.attisdropped
            ),
            'foreign_keys', (
              SELECT json_agg(
                json_build_object(
                  'column', att2.attname,
                  'referenced_table_schema', ns.nspname,
                  'referenced_table', cls.relname,
                  'referenced_column', att.attname
                )
              )
              FROM pg_constraint con
              JOIN pg_class c2 ON c2.oid = con.conrelid
              JOIN pg_namespace nsp2 ON nsp2.oid = c2.relnamespace
              JOIN pg_attribute att2 ON att2.attrelid = con.conrelid
                                    AND att2.attnum = ANY (con.conkey)
              JOIN pg_class cls ON cls.oid = con.confrelid
              JOIN pg_namespace ns ON ns.oid = cls.relnamespace
              JOIN pg_attribute att ON att.attrelid = con.confrelid
                                    AND att.attnum = ANY (con.confkey)
              WHERE con.contype = 'f'
                AND nsp2.nspname = nsp.nspname
                AND c2.relname = t.table_name
            ),
            'primary_keys', (
              SELECT json_agg(
                json_build_object('column', kcu.column_name)
              )
              FROM information_schema.table_constraints tc
              JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
                AND tc.table_name = kcu.table_name
              WHERE tc.constraint_type = 'PRIMARY KEY'
                AND tc.table_schema = nsp.nspname
                AND tc.table_name = t.table_name
            )
          )
        )
        FROM information_schema.tables t
        JOIN pg_class pc ON pc.relname = t.table_name
        JOIN pg_namespace pn ON pn.oid = pc.relnamespace
        WHERE t.table_schema = nsp.nspname
          AND t.table_type = 'BASE TABLE'
          AND pn.nspname = nsp.nspname
      ) AS table_details
    FROM pg_namespace nsp
    WHERE
      has_schema_privilege(current_user, nsp.nspname, 'USAGE')
      AND nsp.nspname NOT LIKE 'pg_%'
      AND nsp.nspname <> 'information_schema';
  `);

  return result;
});
