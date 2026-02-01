import { getDatabaseSource } from '~/server/utils/db-connection';

interface RequestBody {
  dbConnectionString: string;
  schemaName: string;
  tableName: string;
}

export default defineEventHandler(async (event): Promise<string> => {
  const body: RequestBody = await readBody(event);
  const { schemaName, tableName } = body;

  const resource = await getDatabaseSource({
    dbConnectionString: body.dbConnectionString,
    type: 'postgres',
  });

  // Get table DDL using PostgreSQL system catalogs
  const ddlQuery = `
    WITH table_info AS (
      SELECT
        c.oid AS table_oid,
        c.relname AS table_name,
        n.nspname AS schema_name,
        pg_get_userbyid(c.relowner) AS table_owner
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = $1
        AND c.relname = $2
        AND c.relkind = 'r'
    ),
    columns AS (
      SELECT
        a.attname AS column_name,
        a.attnum AS ordinal_position,
        CASE
          WHEN format_type(a.atttypid, a.atttypmod) LIKE 'character varying%'
            THEN REPLACE(format_type(a.atttypid, a.atttypmod), 'character varying', 'varchar')
          WHEN format_type(a.atttypid, a.atttypmod) LIKE 'character%'
            THEN REPLACE(format_type(a.atttypid, a.atttypmod), 'character', 'char')
          WHEN format_type(a.atttypid, a.atttypmod) = 'double precision' THEN 'float8'
          WHEN format_type(a.atttypid, a.atttypmod) = 'integer' THEN 'int4'
          WHEN format_type(a.atttypid, a.atttypmod) = 'smallint' THEN 'int2'
          WHEN format_type(a.atttypid, a.atttypmod) = 'bigint' THEN 'int8'
          WHEN format_type(a.atttypid, a.atttypmod) = 'boolean' THEN 'bool'
          WHEN format_type(a.atttypid, a.atttypmod) = 'timestamp without time zone' THEN 'timestamp'
          WHEN format_type(a.atttypid, a.atttypmod) = 'timestamp with time zone' THEN 'timestamptz'
          ELSE format_type(a.atttypid, a.atttypmod)
        END AS data_type,
        CASE WHEN a.attnotnull THEN 'NOT NULL' ELSE 'NULL' END AS nullable,
        pg_get_expr(d.adbin, d.adrelid) AS default_value
      FROM pg_attribute a
      JOIN table_info ti ON a.attrelid = ti.table_oid
      LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY a.attnum
    ),
    constraints AS (
      SELECT
        con.conname AS constraint_name,
        con.contype AS constraint_type,
        pg_get_constraintdef(con.oid) AS constraint_def
      FROM pg_constraint con
      JOIN table_info ti ON con.conrelid = ti.table_oid
      WHERE con.contype IN ('p', 'u', 'c')
    ),
    indexes AS (
      SELECT
        i.relname AS index_name,
        pg_get_indexdef(i.oid) AS index_def
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN table_info ti ON ix.indrelid = ti.table_oid
      WHERE NOT ix.indisprimary
        AND NOT ix.indisunique
    ),
    foreign_keys AS (
      SELECT
        con.conname AS fk_name,
        'ALTER TABLE ' || $1 || '.' || $2 || ' ADD CONSTRAINT ' || con.conname || ' FOREIGN KEY (' ||
          string_agg(att.attname, ', ' ORDER BY u.seq) ||
          ') REFERENCES ' || nf.nspname || '.' || cf.relname || '(' ||
          string_agg(af.attname, ', ' ORDER BY u.seq) || ')' AS fk_def
      FROM pg_constraint con
      JOIN table_info ti ON con.conrelid = ti.table_oid
      CROSS JOIN LATERAL unnest(con.conkey, con.confkey) WITH ORDINALITY AS u(conkey, confkey, seq)
      JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = u.conkey
      JOIN pg_class cf ON cf.oid = con.confrelid
      JOIN pg_namespace nf ON nf.oid = cf.relnamespace
      JOIN pg_attribute af ON af.attrelid = con.confrelid AND af.attnum = u.confkey
      WHERE con.contype = 'f'
      GROUP BY con.conname, nf.nspname, cf.relname
    ),
    grants AS (
      SELECT
        'GRANT ' || privilege_type || ' ON TABLE ' || $1 || '.' || $2 || ' TO ' || grantee || ';' AS grant_def
      FROM information_schema.table_privileges
      WHERE table_schema = $1
        AND table_name = $2
    )
    SELECT
      json_build_object(
        'schema_name', $1,
        'table_name', $2,
        'table_owner', (SELECT table_owner FROM table_info),
        'columns', (SELECT json_agg(row_to_json(columns.*) ORDER BY ordinal_position) FROM columns),
        'constraints', (SELECT json_agg(row_to_json(constraints.*)) FROM constraints),
        'indexes', (SELECT json_agg(row_to_json(indexes.*)) FROM indexes),
        'foreign_keys', (SELECT json_agg(fk_def) FROM foreign_keys),
        'grants', (SELECT json_agg(grant_def) FROM grants)
      ) AS ddl_data
  `;

  const result = await resource.query(ddlQuery, [schemaName, tableName]);

  if (!result || result.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Table ${schemaName}.${tableName} not found`,
    });
  }

  const ddlData = result[0].ddl_data;

  // Build the DDL string
  const lines: string[] = [];

  // Header comment
  lines.push(`-- ${schemaName}.${tableName} definition`);
  lines.push('');
  lines.push('-- Drop table');
  lines.push('');
  lines.push(`-- DROP TABLE ${schemaName}.${tableName};`);
  lines.push('');

  // CREATE TABLE statement
  lines.push(`CREATE TABLE ${schemaName}.${tableName} (`);

  // Columns
  const columns = ddlData.columns || [];
  const constraints = ddlData.constraints || [];

  const columnDefs = columns.map(
    (col: {
      column_name: string;
      data_type: string;
      default_value: string | null;
      nullable: string;
    }) => {
      const parts = ['\t' + col.column_name, col.data_type];
      if (col.default_value) {
        parts.push('DEFAULT ' + col.default_value);
      }
      parts.push(col.nullable);
      return parts.join(' ');
    }
  );

  // Add constraint definitions inline
  const constraintDefs = constraints.map(
    (con: { constraint_name: string; constraint_def: string }) => {
      return '\tCONSTRAINT "' + con.constraint_name + '" ' + con.constraint_def;
    }
  );

  lines.push([...columnDefs, ...constraintDefs].join(',\n'));
  lines.push(');');

  // Indexes
  const indexes = ddlData.indexes || [];
  if (indexes.length > 0) {
    indexes.forEach((idx: { index_def: string }) => {
      lines.push(idx.index_def + ';');
    });
  }

  // Permissions
  const tableOwner = ddlData.table_owner;
  if (tableOwner) {
    lines.push('');
    lines.push('-- Permissions');
    lines.push('');
    lines.push(
      `ALTER TABLE ${schemaName}.${tableName} OWNER TO ${tableOwner};`
    );

    const grants = ddlData.grants || [];
    grants.forEach((grant: string) => {
      lines.push(grant);
    });
  }

  // Foreign keys
  const foreignKeys = ddlData.foreign_keys || [];
  if (foreignKeys.length > 0) {
    lines.push('');
    lines.push('');
    lines.push(`-- ${schemaName}.${tableName} foreign keys`);
    lines.push('');
    foreignKeys.forEach((fk: string) => {
      lines.push(fk + ';');
    });
  }

  return lines.join('\n');
});
