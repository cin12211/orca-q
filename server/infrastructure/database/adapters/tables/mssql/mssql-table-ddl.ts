import { DatabaseClientType } from '~/core/constants/database-client-type';
import { getSqlDialect } from '~/core/sql-dialect';
import { formatMssqlType } from '../../metadata/mssql/mssql-catalog';

export interface MssqlDdlColumn {
  column_name: string;
  type_name: string;
  max_length: number;
  precision: number;
  scale: number;
  is_nullable: boolean;
  is_identity: boolean;
  is_computed: boolean;
  identity_seed: string | null;
  identity_increment: string | null;
  computed_definition: string | null;
  default_name: string | null;
  default_value: string | null;
}

export interface MssqlDdlIndex {
  name: string;
  isPrimaryKey: boolean;
  isUnique: boolean;
  isUniqueConstraint: boolean;
  typeDesc: string;
  keyColumns: string;
  includedColumns: string | null;
  filter: string | null;
}

export interface MssqlDdlForeignKey {
  name: string;
  columns: string;
  referenced_table: string;
  referenced_columns: string;
  on_delete: string;
  on_update: string;
}

const dialect = getSqlDialect(DatabaseClientType.MSSQL);

function columnDefinition(column: MssqlDdlColumn): string {
  const name = dialect.quoteIdentifier(column.column_name);

  if (column.is_computed && column.computed_definition) {
    return `\t${name} AS ${column.computed_definition}`;
  }

  const parts = [`\t${name}`, formatMssqlType(column).toUpperCase()];

  if (column.is_identity) {
    parts.push(
      `IDENTITY(${column.identity_seed ?? 1},${column.identity_increment ?? 1})`
    );
  }

  parts.push(column.is_nullable ? 'NULL' : 'NOT NULL');

  if (column.default_value) {
    parts.push(
      column.default_name
        ? `CONSTRAINT ${dialect.quoteIdentifier(column.default_name)} DEFAULT ${column.default_value}`
        : `DEFAULT ${column.default_value}`
    );
  }

  return parts.join(' ');
}

/**
 * Rebuilds a CREATE TABLE script from the catalog. SQL Server has no
 * built-in equivalent of SHOW CREATE TABLE; storage options (filegroups,
 * partitioning, compression) are not included.
 */
export function buildMssqlTableDdl(args: {
  schema: string;
  tableName: string;
  columns: MssqlDdlColumn[];
  indexes: MssqlDdlIndex[];
  checks: Array<{ name: string; definition: string }>;
  foreignKeys: MssqlDdlForeignKey[];
}): string {
  const table = dialect.qualifyTableName(args.tableName, args.schema);
  const definitions = args.columns.map(columnDefinition);

  for (const index of args.indexes) {
    if (index.isPrimaryKey || index.isUniqueConstraint) {
      const kind = index.isPrimaryKey ? 'PRIMARY KEY' : 'UNIQUE';
      definitions.push(
        `\tCONSTRAINT ${dialect.quoteIdentifier(index.name)} ${kind} ${index.typeDesc} (${index.keyColumns})`
      );
    }
  }

  for (const check of args.checks) {
    definitions.push(
      `\tCONSTRAINT ${dialect.quoteIdentifier(check.name)} CHECK ${check.definition}`
    );
  }

  const lines = [
    `-- ${args.schema}.${args.tableName} definition`,
    '-- Generated from the catalog; storage options are not included.',
    '',
    `CREATE TABLE ${table} (`,
    definitions.join(',\n'),
    ');',
  ];

  const standaloneIndexes = args.indexes.filter(
    index => !index.isPrimaryKey && !index.isUniqueConstraint
  );

  if (standaloneIndexes.length) {
    lines.push('');
    for (const index of standaloneIndexes) {
      const include = index.includedColumns
        ? ` INCLUDE (${index.includedColumns})`
        : '';
      const where = index.filter ? ` WHERE ${index.filter}` : '';
      lines.push(
        `CREATE ${index.isUnique ? 'UNIQUE ' : ''}${index.typeDesc} INDEX ${dialect.quoteIdentifier(index.name)} ON ${table} (${index.keyColumns})${include}${where};`
      );
    }
  }

  if (args.foreignKeys.length) {
    lines.push('', `-- ${args.schema}.${args.tableName} foreign keys`, '');
    for (const fk of args.foreignKeys) {
      lines.push(
        `ALTER TABLE ${table} ADD CONSTRAINT ${dialect.quoteIdentifier(fk.name)} FOREIGN KEY (${fk.columns}) REFERENCES ${fk.referenced_table} (${fk.referenced_columns}) ON DELETE ${fk.on_delete} ON UPDATE ${fk.on_update};`
      );
    }
  }

  return lines.join('\n');
}
