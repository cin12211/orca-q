/**
 * CockroachDB variant of the Postgres schema metadata query.
 *
 * Differences from Postgres:
 * - `json_object_agg` inside a correlated subquery fails in CockroachDB
 *   ("null value not allowed for object key") when the subquery is empty, so
 *   `view_details` / `table_details` are returned as `[name, details]` pairs
 *   and turned into objects by the adapter.
 * - `format_type()` reports `text(N+4)` for `STRING(N)`; the modifier is
 *   dropped for `text` (oid 25).
 * - Hidden columns (implicit `rowid`, hash-shard columns) are excluded.
 */

const COLUMN_TYPE = `format_type(a.atttypid, CASE WHEN a.atttypid = 25 THEN NULL ELSE a.atttypmod END)`;

const SCHEMA_METADATA_SELECT = `
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
          SELECT json_agg(
            json_build_object(
              'name', c.relname,
              'type',
                CASE c.relkind
                  WHEN 'v' THEN 'VIEW'
                  WHEN 'm' THEN 'MATERIALIZED_VIEW'
                END,
              'oid', c.oid
            )
            ORDER BY c.relname
          )
          FROM pg_class c
          JOIN pg_namespace pn ON pn.oid = c.relnamespace
          WHERE pn.nspname = nsp.nspname
            AND c.relkind IN ('v', 'm')
        ) AS views,
        -- view_details as [name, details] pairs
        (
          SELECT json_agg(
            json_build_array(
              c.relname,
              json_build_object(
                'view_id', c.oid,
                'type',
                  CASE c.relkind
                    WHEN 'v' THEN 'VIEW'
                    WHEN 'm' THEN 'MATERIALIZED_VIEW'
                  END,
                'columns', (
                  SELECT json_agg(
                    json_build_object(
                      'name', a.attname,
                      'ordinal_position', a.attnum,
                      'type', ${COLUMN_TYPE},
                      'raw_type_name', ${COLUMN_TYPE},
                      'is_nullable', NOT a.attnotnull,
                      'short_type_name', ${COLUMN_TYPE}
                    )
                    ORDER BY a.attnum
                  )
                  FROM pg_attribute a
                  WHERE a.attrelid = c.oid
                    AND a.attnum > 0
                    AND NOT a.attisdropped
                )
              )
            )
          )
          FROM pg_class c
          JOIN pg_namespace pn ON pn.oid = c.relnamespace
          WHERE pn.nspname = nsp.nspname
            AND c.relkind IN ('v', 'm')
        ) AS view_details,
        -- functions
        (
          SELECT json_agg(
            json_build_object(
              'name', p.proname,
              'oId', p.oid,
              'type', CASE p.prokind WHEN 'p' THEN 'PROCEDURE' ELSE 'FUNCTION' END,
              'parameters', pg_get_function_arguments(p.oid),
              'schema', nsp.nspname
            )
          )
          FROM pg_proc p
          WHERE p.pronamespace = nsp.oid
        ) AS functions,
        -- table_details as [name, details] pairs
        (
          SELECT json_agg(
            json_build_array(
              t.table_name,
              json_build_object(
                'table_id', pc.oid,
                'columns', (
                  SELECT json_agg(
                    json_build_object(
                      'name', a.attname,
                      'ordinal_position', a.attnum,
                      'type', ${COLUMN_TYPE},
                      'raw_type_name', ${COLUMN_TYPE},
                      'is_nullable', NOT a.attnotnull,
                      'default_value', pg_get_expr(d.adbin, d.adrelid),
                      'short_type_name', ${COLUMN_TYPE}
                    )
                    ORDER BY a.attnum
                  )
                  FROM pg_attribute a
                  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
                  JOIN information_schema.columns ic
                    ON ic.table_schema = nsp.nspname
                    AND ic.table_name = t.table_name
                    AND ic.column_name = a.attname
                  WHERE a.attrelid = pc.oid
                    AND a.attnum > 0
                    AND NOT a.attisdropped
                    AND ic.is_hidden = 'NO'
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
                  JOIN pg_attribute att2 ON att2.attrelid = con.conrelid
                                        AND att2.attnum = ANY (con.conkey)
                  JOIN pg_class cls ON cls.oid = con.confrelid
                  JOIN pg_namespace ns ON ns.oid = cls.relnamespace
                  JOIN pg_attribute att ON att.attrelid = con.confrelid
                                        AND att.attnum = ANY (con.confkey)
                  WHERE con.contype = 'f'
                    AND con.conrelid = pc.oid
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
                    AND kcu.column_name <> 'rowid'
                )
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
`;

const USER_SCHEMAS_FILTER = `
      WHERE
        has_schema_privilege(current_user, nsp.nspname, 'USAGE')
        AND nsp.nspname NOT LIKE 'pg_%'
        AND nsp.nspname NOT IN ('information_schema', 'crdb_internal')
`;

const SINGLE_SCHEMA_FILTER = `
      WHERE
        has_schema_privilege(current_user, nsp.nspname, 'USAGE')
        AND nsp.nspname = ?
`;

export function buildSchemaMetaDataQuery(schemaName?: string): string {
  const filter = schemaName ? SINGLE_SCHEMA_FILTER : USER_SCHEMAS_FILTER;

  return `${SCHEMA_METADATA_SELECT}${filter.trimEnd()};`;
}
