import { executeQuery } from "~/server/utils/db-connection";

interface ColumnMetadata {
  name: string;
  ordinal_position: number;
  type: string;
  character_maximum_length: number | null;
  precision: { precision: number; scale: number } | null;
  nullable: boolean;
  default: string | null;
  collation: string | null;
  comment: string | null;
}

interface ForeignKeyMetadata {
  foreign_key_name: string;
  column: string;
  reference_schema: string;
  reference_table: string;
  reference_column: string;
  fk_def: string;
}

interface PrimaryKeyMetadata {
  column: string;
  pk_def: string;
}

interface IndexMetadata {
  index_name: string;
  column: string;
  index_type: string;
  index_size: number;
  is_unique: boolean;
  cardinality: number;
  column_position: number;
  direction: "ASC" | "DESC";
}

interface TableMetadata {
  schema: string;
  table: string;
  rows: number;
  type: string;
  comment: string | null;
  columns: ColumnMetadata[];
  foreign_keys: ForeignKeyMetadata[];
  primary_keys: PrimaryKeyMetadata[];
  indexes: IndexMetadata[];
}

interface ViewMetadata {
  schema: string;
  view_name: string;
  view_definition: string; // Base64-encoded
}

interface ConfigMetadata {
  name: string;
  value: string;
}

interface DatabaseMetadata {
  tables: TableMetadata[];
  views: ViewMetadata[];
  databaseName: string;
  version: string;
  config: ConfigMetadata[];
}

interface QueryResult {
  result: {
    metadata: DatabaseMetadata;
  }[];
}

export default defineEventHandler(async (event): Promise<QueryResult> => {
  //   const body: { query: string } = await readBody(event);

  const result = await executeQuery(`
        -- select nspname
        -- from pg_catalog.pg_namespace;
        -- show all table detail in schema (2)
        WITH
            fk_info AS (
                SELECT
                    n.nspname AS schema_name,
                    cl.relname AS table_name,
                    json_agg(
                        json_build_object(
                            'foreign_key_name',
                            c.conname,
                            'column',
                            a.attname,
                            'reference_schema',
                            nr.nspname,
                            'reference_table',
                            clf.relname,
                            'reference_column',
                            af.attname,
                            'fk_def',
                            pg_get_constraintdef(c.oid)
                        )
                    ) AS fk_metadata
                FROM
                    pg_constraint c
                    JOIN pg_attribute a ON a.attnum = ANY (c.conkey)
                    AND a.attrelid = c.conrelid
                    JOIN pg_class cl ON cl.oid = c.conrelid
                    JOIN pg_namespace n ON n.oid = cl.relnamespace
                    JOIN pg_attribute af ON af.attnum = ANY (c.confkey)
                    AND af.attrelid = c.confrelid
                    JOIN pg_class clf ON clf.oid = c.confrelid
                    JOIN pg_namespace nr ON nr.oid = clf.relnamespace
                WHERE
                    c.contype = 'f'
                    AND n.nspname NOT IN ('information_schema', 'pg_catalog')
                GROUP BY
                    n.nspname,
                    cl.relname
            ),
            pk_info AS (
                SELECT
                    n.nspname AS schema_name,
                    cl.relname AS table_name,
                    json_agg(
                        json_build_object(
                            'column',
                            a.attname,
                            'pk_def',
                            pg_get_constraintdef(c.oid)
                        )
                    ) AS pk_metadata
                FROM
                    pg_constraint c
                    JOIN pg_class cl ON cl.oid = c.conrelid
                    JOIN pg_namespace n ON n.oid = cl.relnamespace
                    JOIN pg_attribute a ON a.attrelid = c.conrelid
                    AND a.attnum = ANY (c.conkey)
                WHERE
                    c.contype = 'p'
                    AND n.nspname NOT IN ('information_schema', 'pg_catalog')
                GROUP BY
                    n.nspname,
                    cl.relname
            ),
            indexes_cols AS (
                SELECT
                    tnsp.nspname AS schema_name,
                    trel.relname AS table_name,
                    json_agg(
                        json_build_object(
                            'index_name',
                            irel.relname,
                            'column',
                            a.attname,
                            'index_type',
                            am.amname,
                            'index_size',
                            pg_relation_size(
                                '"' || tnsp.nspname || '"."' || irel.relname || '"'
                            ),
                            'is_unique',
                            i.indisunique,
                            'cardinality',
                            irel.reltuples,
                            'column_position',
                            1 + array_position(i.indkey, a.attnum),
                            'direction',
                            CASE
                                WHEN o.option & 1 = 1 THEN 'DESC'
                                ELSE 'ASC'
                            END
                        )
                    ) AS indexes_metadata
                FROM
                    pg_index i
                    JOIN pg_class trel ON trel.oid = i.indrelid
                    JOIN pg_namespace tnsp ON trel.relnamespace = tnsp.oid
                    JOIN pg_class irel ON irel.oid = i.indexrelid
                    JOIN pg_am am ON irel.relam = am.oid
                    CROSS JOIN LATERAL unnest(i.indkey)
                WITH
                    ORDINALITY AS c (colnum, ordinality)
                    LEFT JOIN LATERAL unnest(i.indoption)
                WITH
                    ORDINALITY AS o (option, ordinality) ON c.ordinality = o.ordinality
                    JOIN pg_attribute a ON trel.oid = a.attrelid
                    AND a.attnum = c.colnum
                WHERE
                    tnsp.nspname NOT LIKE 'pg_%'
                GROUP BY
                    tnsp.nspname,
                    trel.relname
            ),
            columns_info AS (
                SELECT
                    cols.table_schema AS schema_name,
                    cols.table_name,
                    json_agg(
                        json_build_object(
                            'name',
                            cols.column_name,
                            'ordinal_position',
                            cols.ordinal_position,
                            'type',
                            LOWER(cols.data_type),
                            'character_maximum_length',
                            cols.character_maximum_length,
                            'precision',
                            CASE
                                WHEN cols.data_type IN ('numeric', 'decimal') THEN json_build_object(
                                    'precision',
                                    cols.numeric_precision,
                                    'scale',
                                    cols.numeric_scale
                                )
                                ELSE NULL
                            END,
                            'nullable',
                            cols.is_nullable = 'YES',
                            'default',
                            cols.column_default,
                            'collation',
                            cols.collation_name,
                            'comment',
                            dsc.description
                        )
                    ) AS columns_metadata
                FROM
                    information_schema.columns cols
                    LEFT JOIN pg_catalog.pg_class c ON c.relname = cols.table_name
                    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                    AND n.nspname = cols.table_schema
                    LEFT JOIN pg_catalog.pg_description dsc ON dsc.objoid = c.oid
                    AND dsc.objsubid = cols.ordinal_position
                WHERE
                    cols.table_schema NOT IN ('information_schema', 'pg_catalog')
                GROUP BY
                    cols.table_schema,
                    cols.table_name
            ),
            tbls AS (
                SELECT
                    json_agg(
                        json_build_object(
                            'schema',
                            tbls.table_schema,
                            'table',
                            tbls.table_name,
                            'rows',
                            COALESCE(
                                (
                                    SELECT
                                        s.n_live_tup
                                    FROM
                                        pg_stat_user_tables s
                                    WHERE
                                        tbls.table_schema = s.schemaname
                                        AND tbls.table_name = s.relname
                                ),
                                0
                            ),
                            'type',
                            tbls.table_type,
                            'comment',
                            dsc.description,
                            'columns',
                            columns_info.columns_metadata,
                            'foreign_keys',
                            COALESCE(fk_info.fk_metadata, '[]'),
                            'primary_keys',
                            COALESCE(pk_info.pk_metadata, '[]'),
                            'indexes',
                            COALESCE(indexes_cols.indexes_metadata, '[]')
                        )
                    ) AS tbls_metadata
                FROM
                    information_schema.tables tbls
                    LEFT JOIN pg_catalog.pg_class c ON c.relname = tbls.table_name
                    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                    AND n.nspname = tbls.table_schema
                    LEFT JOIN pg_catalog.pg_description dsc ON dsc.objoid = c.oid
                    AND dsc.objsubid = 0
                    LEFT JOIN columns_info ON columns_info.schema_name = tbls.table_schema
                    AND columns_info.table_name = tbls.table_name
                    LEFT JOIN fk_info ON fk_info.schema_name = tbls.table_schema
                    AND fk_info.table_name = tbls.table_name
                    LEFT JOIN pk_info ON pk_info.schema_name = tbls.table_schema
                    AND pk_info.table_name = tbls.table_name
                    LEFT JOIN indexes_cols ON indexes_cols.schema_name = tbls.table_schema
                    AND indexes_cols.table_name = tbls.table_name
                WHERE
                    tbls.table_schema NOT IN ('information_schema', 'pg_catalog')
            ),
            views AS (
                SELECT
                    json_agg(
                        json_build_object(
                            'schema',
                            views.schemaname,
                            'view_name',
                            views.viewname,
                            'view_definition',
                            encode(convert_to(views.definition, 'UTF8'), 'base64')
                        )
                    ) AS views_metadata
                FROM
                    pg_views views
                WHERE
                    views.schemaname NOT IN ('information_schema', 'pg_catalog')
            ),
            config AS (
                SELECT
                    json_agg(
                        json_build_object('name', conf.name, 'value', conf.setting)
                    ) AS config_metadata
                FROM
                    pg_settings conf
            )
        SELECT
            json_build_object(
                'tables',
                COALESCE(tbls.tbls_metadata, '[]'),
                'views',
                COALESCE(views.views_metadata, '[]'),
                'databaseName',
                current_database(),
                'version',
                version(),
                'config',
                COALESCE(config.config_metadata, '[]')
            ) AS metadata
        FROM
            tbls,
            views,
            config;
    `);

  return {
    result,
  };
});
