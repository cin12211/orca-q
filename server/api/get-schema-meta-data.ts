import { getDatabaseSource } from '~/server/utils/db-connection';

export interface ColumnShortMetadata {
  name: string;
  ordinal_position: number;
  type: string;
  short_type_name: string;
}

interface ForeignKey {
  column: string;
}

interface PrimaryKey {
  column: string;
}

export interface TableDetailMetadata {
  columns: ColumnShortMetadata[];
  foreign_keys: ForeignKey[];
  primary_keys: PrimaryKey[];
  table_id: string;
}

export interface TableDetails {
  [tableName: string]: TableDetailMetadata;
}

export interface SchemaMetaData {
  name: string;
  tables: string[] | null;
  views: string[] | null;
  functions: string[] | null;
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
            SELECT json_agg(routine_name)
            FROM information_schema.routines r
            WHERE r.routine_schema = nsp.nspname
              AND r.routine_type = 'FUNCTION'
          ) AS functions,
          -- table_details
          (
            SELECT json_object_agg(
              t.table_name,
              json_build_object(
                'table_id', pc.oid,   -- ✅ table id
                'columns', (
                  SELECT json_agg(
                    json_build_object(
                      'name', c.column_name,
                      'ordinal_position', c.ordinal_position,
                      'type', c.data_type,
                       'short_type_name', CASE
                          WHEN c.data_type = 'character varying' THEN 'varchar'
                          WHEN c.data_type = 'character' THEN 'char'
                          WHEN c.data_type = 'timestamp without time zone' THEN 'timestamp'
                          WHEN c.data_type = 'timestamp with time zone' THEN 'timestamptz'
                          WHEN c.data_type = 'time without time zone' THEN 'time'
                          WHEN c.data_type = 'time with time zone' THEN 'timetz'
                          WHEN c.data_type = 'double precision' THEN 'float8'
                          WHEN c.data_type = 'real' THEN 'float4'
                          WHEN c.data_type = 'integer' THEN 'int4'
                          WHEN c.data_type = 'bigint' THEN 'int8'
                          WHEN c.data_type = 'smallint' THEN 'int2'
                          WHEN c.data_type = 'boolean' THEN 'bool'
                          ELSE c.data_type
                        END
                    )
                  )
                  FROM information_schema.columns c
                  WHERE c.table_schema = nsp.nspname
                    AND c.table_name = t.table_name
                ),
                'foreign_keys', (
                  SELECT json_agg(
                    json_build_object(
                      'column', kcu.column_name
                    )
                  )
                  FROM information_schema.table_constraints tc
                  JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                    AND tc.table_name = kcu.table_name
                  WHERE tc.constraint_type = 'FOREIGN KEY'
                    AND tc.table_schema = nsp.nspname
                    AND tc.table_name = t.table_name
                ),
                'primary_keys', (
                  SELECT json_agg(
                    json_build_object(
                      'column', kcu.column_name
                    )
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
