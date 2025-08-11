import { getDatabaseSource } from '~/server/utils/db-connection';

interface Column {
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

interface TableDetail {
  columns: Column[];
  foreign_keys: ForeignKey[];
  primary_keys: PrimaryKey[];
}

export interface TableDetails {
  [tableName: string]: TableDetail;
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
            -- tables: danh sách tên bảng
            (
              SELECT json_agg(table_name)
              FROM information_schema.tables t
              WHERE t.table_schema = nsp.nspname
                AND t.table_type = 'BASE TABLE'
            ) AS tables,
            -- views: danh sách tên view
            (
              SELECT json_agg(table_name)
              FROM information_schema.tables t
              WHERE t.table_schema = nsp.nspname
                AND t.table_type = 'VIEW'
            ) AS views,
            -- functions: danh sách tên hàm
            (
              SELECT json_agg(routine_name)
              FROM information_schema.routines r
              WHERE r.routine_schema = nsp.nspname
                AND r.routine_type = 'FUNCTION'
            ) AS functions,
            -- table_details: thông tin chi tiết các cột, khóa ngoại và khóa chính
            (
              SELECT json_object_agg(
                t.table_name,
                json_build_object(
                  'columns', (
                    SELECT json_agg(
                      json_build_object(
                        'name', c.column_name,
                        'ordinal_position', c.ordinal_position,
                        'type', c.data_type,
                        'short_type_name', CASE
                          WHEN c.data_type = 'character varying' THEN 'varchar'
                          WHEN c.data_type = 'character' THEN 'char'
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
              WHERE t.table_schema = nsp.nspname
                AND t.table_type = 'BASE TABLE'
            ) AS table_details
        FROM pg_namespace nsp
        WHERE
            has_schema_privilege(current_user, nsp.nspname, 'USAGE')
            AND nsp.nspname NOT LIKE 'pg_%'
            AND nsp.nspname <> 'information_schema';
    `);

  return result;
});
