export interface ReservedTableSchemas {
  schema: string;
  table: string;
  rows: number;
  type: string;
  primary_keys: {
    column: string;
  }[];
  used_by: {
    referencing_schema: string;
    referencing_table: string;
    foreign_key_name: string;
    fk_column: string;
    referenced_column: string;
  }[];
}

export interface QueryResult {
  result: ReservedTableSchemas[];
}

export default defineEventHandler(async (event): Promise<QueryResult> => {
  const body: { dbConnectionString: string } = await readBody(event);

  const resource = await getDatabaseSource({
    dbConnectionString: body.dbConnectionString,
    type: 'postgres',
  });

  const result = await resource.query(`
        WITH
        pk_info AS (
            SELECT
            n.nspname AS schema_name,
            cl.relname AS table_name,
            json_agg(
                json_build_object('column', a.attname)
            ) AS pk_metadata
            FROM
            pg_constraint c
            JOIN pg_class cl ON cl.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = cl.relnamespace
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
            WHERE
            c.contype = 'p'
            AND n.nspname NOT IN ('information_schema', 'pg_catalog')
            GROUP BY
            n.nspname, cl.relname
        ),

        fk_used_by AS (
            SELECT
            nr.nspname AS schema_name,
            clf.relname AS table_name,
            json_agg(
                json_build_object(
                'referencing_schema', n.nspname,
                'referencing_table', cl.relname,
                'foreign_key_name', c.conname,
                'fk_column', a.attname,
                'referenced_column', af.attname
                )
            ) AS used_by
            FROM
            pg_constraint c
            JOIN pg_class cl ON cl.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = cl.relnamespace
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
            JOIN pg_class clf ON clf.oid = c.confrelid
            JOIN pg_namespace nr ON nr.oid = clf.relnamespace
            JOIN pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = ANY (c.confkey)
            WHERE
            c.contype = 'f'
            AND n.nspname NOT IN ('information_schema', 'pg_catalog')
            GROUP BY
            nr.nspname, clf.relname
        ),

        tbls AS (
            SELECT
            json_agg(
                json_build_object(
                'schema', tbls.table_schema,
                'table', tbls.table_name,
                'rows', COALESCE((
                    SELECT s.n_live_tup
                    FROM pg_stat_user_tables s
                    WHERE tbls.table_schema = s.schemaname
                    AND tbls.table_name = s.relname
                ), 0),
                'type', tbls.table_type,
                'primary_keys', COALESCE(pk_info.pk_metadata, '[]'),
                'used_by', COALESCE(fk_used_by.used_by, '[]')
                )
            ) AS tbls_metadata
            FROM
            information_schema.tables tbls
            LEFT JOIN pg_catalog.pg_class c ON c.relname = tbls.table_name
            JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                AND n.nspname = tbls.table_schema
            LEFT JOIN pk_info ON pk_info.schema_name = tbls.table_schema
                AND pk_info.table_name = tbls.table_name
            LEFT JOIN fk_used_by ON fk_used_by.schema_name = tbls.table_schema
                AND fk_used_by.table_name = tbls.table_name
            WHERE
            tbls.table_schema NOT IN ('information_schema', 'pg_catalog')
        )

        SELECT
        COALESCE(tbls.tbls_metadata, '[]') AS tables
        FROM
        tbls;
    `);

  return {
    result: result[0]?.tables,
  };
});
