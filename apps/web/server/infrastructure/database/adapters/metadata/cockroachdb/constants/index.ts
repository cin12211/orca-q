import {
  getErdDataQuery as postgresErdDataQuery,
  getReverseSchemasQuery as postgresReverseSchemasQuery,
  getSchemaNamesQuery as postgresSchemaNamesQuery,
} from '../../postgres/constants';

/**
 * CockroachDB exposes a Postgres-compatible catalog, so its metadata queries
 * are derived from the Postgres ones with a few targeted rewrites:
 *
 * - `crdb_internal` and `pg_extension` are treated as system schemas (they
 *   hold hundreds of virtual tables that would flood the ERD and schema tree).
 * - `pg_relation_size()` does not exist in CockroachDB; index sizes report 0.
 * - Hidden columns (the implicit `rowid` primary key, hash-shard columns) are
 *   excluded from the ERD so they do not show up as real table columns.
 * - Comments are scoped to `pg_class`: built-in function oids collide with
 *   table oids in `pg_description`.
 *
 * The schema tree query differs more and lives in `schema-metadata.query.ts`.
 *
 * Each rewrite throws at module load if its anchor is missing, so a change to
 * the Postgres queries cannot silently break CockroachDB.
 */

const COCKROACH_SYSTEM_SCHEMAS = `'information_schema', 'pg_catalog', 'crdb_internal', 'pg_extension'`;

function replaceOrThrow(
  sql: string,
  search: string | RegExp,
  replacement: string,
  label: string
): string {
  const matches =
    typeof search === 'string' ? sql.includes(search) : search.test(sql);

  if (!matches) {
    throw new Error(`CockroachDB metadata query rewrite failed: ${label}`);
  }

  return typeof search === 'string'
    ? sql.split(search).join(replacement)
    : sql.replace(
        new RegExp(
          search.source,
          search.flags.includes('g') ? search.flags : `${search.flags}g`
        ),
        replacement
      );
}

function excludeCockroachSystemSchemas(sql: string): string {
  return replaceOrThrow(
    sql,
    /NOT IN \('information_schema', 'pg_catalog'\)/,
    `NOT IN (${COCKROACH_SYSTEM_SCHEMAS})`,
    'system schema filter'
  );
}

export const getSchemaNamesQuery = replaceOrThrow(
  postgresSchemaNamesQuery,
  `nsp.nspname IN ('pg_catalog', 'information_schema') AS is_system`,
  `nsp.nspname IN (${COCKROACH_SYSTEM_SCHEMAS}) AS is_system`,
  'schema names system flag'
);

export const getErdDataQuery = (() => {
  let sql = excludeCockroachSystemSchemas(postgresErdDataQuery);

  sql = replaceOrThrow(
    sql,
    /pg_relation_size\(\s*'"' \|\| tnsp\.nspname \|\| '"\."' \|\| irel\.relname \|\| '"'\s*\)/,
    '0',
    'index size'
  );
  // pg_description also holds comments for built-in functions whose oids
  // collide with table oids in CockroachDB; scope it to relations.
  sql = replaceOrThrow(
    sql,
    'dsc.objoid = c.oid',
    `dsc.objoid = c.oid AND dsc.classoid = 'pg_catalog.pg_class'::REGCLASS`,
    'table comment scope'
  );
  sql = replaceOrThrow(
    sql,
    `tnsp.nspname NOT LIKE 'pg_%'`,
    `tnsp.nspname NOT LIKE 'pg_%' AND tnsp.nspname NOT IN (${COCKROACH_SYSTEM_SCHEMAS})`,
    'index schema filter'
  );
  sql = replaceOrThrow(
    sql,
    `WHERE
                    cols.table_schema NOT IN (${COCKROACH_SYSTEM_SCHEMAS})`,
    `WHERE
                    cols.table_schema NOT IN (${COCKROACH_SYSTEM_SCHEMAS})
                    AND cols.is_hidden = 'NO'`,
    'hidden ERD columns'
  );

  return sql;
})();

export const getReverseSchemasQuery = excludeCockroachSystemSchemas(
  postgresReverseSchemasQuery
);

export { buildSchemaMetaDataQuery } from './schema-metadata.query';
