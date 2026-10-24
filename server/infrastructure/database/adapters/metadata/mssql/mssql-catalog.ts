import type { IDatabaseAdapter } from '~/server/infrastructure/driver';

/**
 * Flat SQL Server catalog reads (sys.* views). Rows are grouped in Node rather
 * than with FOR JSON so results do not depend on JSON support or the
 * 2033-character chunking of FOR JSON output.
 */

// Role schemas (db_owner, db_datareader, …) and guest never hold user objects.
const HIDDEN_SCHEMA_FILTER = `s.name NOT LIKE 'db[_]%' AND s.name <> 'guest'`;
export const SYSTEM_SCHEMAS = new Set(['sys', 'INFORMATION_SCHEMA']);

export interface MssqlSchemaRow {
  schema_name: string;
}

export interface MssqlObjectRow {
  schema_name: string;
  object_name: string;
  object_id: number;
  row_count?: number | string | null;
  comment?: string | null;
}

export interface MssqlColumnRow {
  schema_name: string;
  object_name: string;
  column_name: string;
  column_id: number;
  type_name: string;
  max_length: number;
  precision: number;
  scale: number;
  is_nullable: boolean;
  is_identity: boolean;
  is_computed: boolean;
  default_value: string | null;
  collation_name: string | null;
  comment: string | null;
}

export interface MssqlKeyColumnRow {
  schema_name: string;
  table_name: string;
  constraint_name: string;
  column_name: string;
  key_ordinal: number;
}

export interface MssqlForeignKeyRow {
  schema_name: string;
  table_name: string;
  constraint_name: string;
  column_name: string;
  referenced_schema: string;
  referenced_table: string;
  referenced_column: string;
  delete_action: string;
  update_action: string;
}

export interface MssqlIndexColumnRow {
  schema_name: string;
  table_name: string;
  index_name: string;
  index_type: string;
  is_unique: boolean;
  is_primary_key: boolean;
  column_name: string;
  key_ordinal: number;
  is_descending_key: boolean;
}

export interface MssqlRoutineRow {
  schema_name: string;
  object_name: string;
  object_id: number;
  object_type: string;
}

/** `nvarchar(50)`, `decimal(10,2)`, `datetime2(7)`, `varchar(max)`, … */
export function formatMssqlType(column: {
  type_name: string;
  max_length: number;
  precision: number;
  scale: number;
}): string {
  const type = column.type_name.toLowerCase();
  const length = column.max_length === -1 ? 'max' : column.max_length;

  if (['varchar', 'char', 'varbinary', 'binary'].includes(type)) {
    return `${type}(${length})`;
  }

  if (['nvarchar', 'nchar'].includes(type)) {
    return `${type}(${column.max_length === -1 ? 'max' : column.max_length / 2})`;
  }

  if (['decimal', 'numeric'].includes(type)) {
    return `${type}(${column.precision},${column.scale})`;
  }

  if (['datetime2', 'time', 'datetimeoffset'].includes(type)) {
    return `${type}(${column.scale})`;
  }

  return type;
}

function schemaCondition(column: string, schemaName?: string) {
  return schemaName ? `AND ${column} = ?` : '';
}

function schemaBindings(schemaName?: string) {
  return schemaName ? [schemaName] : [];
}

export class MssqlCatalog {
  constructor(private readonly adapter: IDatabaseAdapter) {}

  getSchemas(): Promise<MssqlSchemaRow[]> {
    return this.adapter.rawQuery<MssqlSchemaRow>(`
      SELECT s.name AS schema_name
      FROM sys.schemas s
      WHERE ${HIDDEN_SCHEMA_FILTER}
      ORDER BY CASE WHEN s.name IN ('sys', 'INFORMATION_SCHEMA') THEN 1 ELSE 0 END, s.name
    `);
  }

  getTables(schemaName?: string): Promise<MssqlObjectRow[]> {
    return this.adapter.rawQuery<MssqlObjectRow>(
      `
      SELECT
        s.name AS schema_name,
        t.name AS object_name,
        t.object_id,
        (
          SELECT SUM(p.rows)
          FROM sys.partitions p
          WHERE p.object_id = t.object_id AND p.index_id IN (0, 1)
        ) AS row_count,
        CAST(ep.value AS NVARCHAR(4000)) AS comment
      FROM sys.tables t
      JOIN sys.schemas s ON s.schema_id = t.schema_id
      LEFT JOIN sys.extended_properties ep
        ON ep.class = 1 AND ep.major_id = t.object_id AND ep.minor_id = 0
        AND ep.name = 'MS_Description'
      WHERE t.is_ms_shipped = 0
        ${schemaCondition('s.name', schemaName)}
      ORDER BY s.name, t.name
      `,
      schemaBindings(schemaName)
    );
  }

  getViews(schemaName?: string): Promise<MssqlObjectRow[]> {
    return this.adapter.rawQuery<MssqlObjectRow>(
      `
      SELECT s.name AS schema_name, v.name AS object_name, v.object_id
      FROM sys.views v
      JOIN sys.schemas s ON s.schema_id = v.schema_id
      WHERE v.is_ms_shipped = 0
        ${schemaCondition('s.name', schemaName)}
      ORDER BY s.name, v.name
      `,
      schemaBindings(schemaName)
    );
  }

  getColumns(schemaName?: string): Promise<MssqlColumnRow[]> {
    return this.adapter.rawQuery<MssqlColumnRow>(
      `
      SELECT
        s.name AS schema_name,
        o.name AS object_name,
        c.name AS column_name,
        c.column_id,
        ty.name AS type_name,
        c.max_length,
        c.precision,
        c.scale,
        c.is_nullable,
        c.is_identity,
        c.is_computed,
        dc.definition AS default_value,
        c.collation_name,
        CAST(ep.value AS NVARCHAR(4000)) AS comment
      FROM sys.columns c
      JOIN sys.objects o ON o.object_id = c.object_id
      JOIN sys.schemas s ON s.schema_id = o.schema_id
      JOIN sys.types ty ON ty.user_type_id = c.user_type_id
      LEFT JOIN sys.default_constraints dc ON dc.object_id = c.default_object_id
      LEFT JOIN sys.extended_properties ep
        ON ep.class = 1 AND ep.major_id = c.object_id AND ep.minor_id = c.column_id
        AND ep.name = 'MS_Description'
      WHERE o.type IN ('U', 'V')
        AND o.is_ms_shipped = 0
        ${schemaCondition('s.name', schemaName)}
      ORDER BY s.name, o.name, c.column_id
      `,
      schemaBindings(schemaName)
    );
  }

  getPrimaryKeys(schemaName?: string): Promise<MssqlKeyColumnRow[]> {
    return this.adapter.rawQuery<MssqlKeyColumnRow>(
      `
      SELECT
        s.name AS schema_name,
        t.name AS table_name,
        i.name AS constraint_name,
        c.name AS column_name,
        ic.key_ordinal
      FROM sys.indexes i
      JOIN sys.tables t ON t.object_id = i.object_id
      JOIN sys.schemas s ON s.schema_id = t.schema_id
      JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
      JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
      WHERE i.is_primary_key = 1
        AND t.is_ms_shipped = 0
        ${schemaCondition('s.name', schemaName)}
      ORDER BY s.name, t.name, ic.key_ordinal
      `,
      schemaBindings(schemaName)
    );
  }

  getForeignKeys(schemaName?: string): Promise<MssqlForeignKeyRow[]> {
    return this.adapter.rawQuery<MssqlForeignKeyRow>(
      `
      SELECT
        s.name AS schema_name,
        t.name AS table_name,
        fk.name AS constraint_name,
        c.name AS column_name,
        rs.name AS referenced_schema,
        rt.name AS referenced_table,
        rc.name AS referenced_column,
        REPLACE(fk.delete_referential_action_desc, '_', ' ') AS delete_action,
        REPLACE(fk.update_referential_action_desc, '_', ' ') AS update_action
      FROM sys.foreign_keys fk
      JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
      JOIN sys.tables t ON t.object_id = fk.parent_object_id
      JOIN sys.schemas s ON s.schema_id = t.schema_id
      JOIN sys.columns c ON c.object_id = fkc.parent_object_id AND c.column_id = fkc.parent_column_id
      JOIN sys.tables rt ON rt.object_id = fk.referenced_object_id
      JOIN sys.schemas rs ON rs.schema_id = rt.schema_id
      JOIN sys.columns rc ON rc.object_id = fkc.referenced_object_id AND rc.column_id = fkc.referenced_column_id
      WHERE t.is_ms_shipped = 0
        ${schemaCondition('s.name', schemaName)}
      ORDER BY s.name, t.name, fk.name, fkc.constraint_column_id
      `,
      schemaBindings(schemaName)
    );
  }

  getIndexColumns(schemaName?: string): Promise<MssqlIndexColumnRow[]> {
    return this.adapter.rawQuery<MssqlIndexColumnRow>(
      `
      SELECT
        s.name AS schema_name,
        t.name AS table_name,
        i.name AS index_name,
        LOWER(i.type_desc) AS index_type,
        i.is_unique,
        i.is_primary_key,
        c.name AS column_name,
        ic.key_ordinal,
        ic.is_descending_key
      FROM sys.indexes i
      JOIN sys.tables t ON t.object_id = i.object_id
      JOIN sys.schemas s ON s.schema_id = t.schema_id
      JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
      JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
      WHERE i.index_id > 0
        AND ic.key_ordinal > 0
        AND t.is_ms_shipped = 0
        ${schemaCondition('s.name', schemaName)}
      ORDER BY s.name, t.name, i.name, ic.key_ordinal
      `,
      schemaBindings(schemaName)
    );
  }

  getRoutines(schemaName?: string): Promise<MssqlRoutineRow[]> {
    return this.adapter.rawQuery<MssqlRoutineRow>(
      `
      SELECT
        s.name AS schema_name,
        o.name AS object_name,
        o.object_id,
        RTRIM(o.type) AS object_type
      FROM sys.objects o
      JOIN sys.schemas s ON s.schema_id = o.schema_id
      WHERE o.type IN ('P', 'FN', 'IF', 'TF')
        AND o.is_ms_shipped = 0
        ${schemaCondition('s.name', schemaName)}
      ORDER BY s.name, o.name
      `,
      schemaBindings(schemaName)
    );
  }
}
