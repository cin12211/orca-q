/**
 * SQL Server catalog queries for the table views. Sizes come from
 * sys.allocation_units, which only needs metadata visibility on the table
 * (sys.dm_db_partition_stats would require VIEW DATABASE STATE).
 */

const TABLE_SIZE_APPLY = `
  OUTER APPLY (
    SELECT SUM(p.rows) AS row_count
    FROM sys.partitions p
    WHERE p.object_id = t.object_id AND p.index_id IN (0, 1)
  ) rc
  OUTER APPLY (
    SELECT
      SUM(a.total_pages) * 8 AS total_kb,
      SUM(CASE WHEN p.index_id IN (0, 1) THEN a.used_pages ELSE 0 END) * 8 AS data_kb,
      SUM(CASE WHEN p.index_id > 1 THEN a.used_pages ELSE 0 END) * 8 AS index_kb
    FROM sys.partitions p
    JOIN sys.allocation_units a ON a.container_id = p.partition_id
    WHERE p.object_id = t.object_id
  ) sz`;

const TABLE_COMMENT_JOIN = `
  LEFT JOIN sys.extended_properties ep
    ON ep.class = 1 AND ep.major_id = t.object_id AND ep.minor_id = 0
    AND ep.name = 'MS_Description'`;

export const OVERVIEW_TABLES_QUERY = `
  SELECT
    t.name AS name,
    s.name AS [schema],
    'TABLE' AS kind,
    COALESCE(USER_NAME(t.principal_id), USER_NAME(s.principal_id)) AS owner,
    rc.row_count AS estimated_row,
    sz.total_kb,
    sz.data_kb,
    sz.index_kb,
    CAST(ep.value AS NVARCHAR(4000)) AS comment
  FROM sys.tables t
  JOIN sys.schemas s ON s.schema_id = t.schema_id
  ${TABLE_SIZE_APPLY}
  ${TABLE_COMMENT_JOIN}
  WHERE s.name = ? AND t.is_ms_shipped = 0
  ORDER BY t.name`;

export const TABLE_META_QUERY = `
  SELECT
    COALESCE(USER_NAME(t.principal_id), USER_NAME(s.principal_id)) AS owner,
    rc.row_count,
    sz.total_kb,
    sz.data_kb,
    sz.index_kb
  FROM sys.tables t
  JOIN sys.schemas s ON s.schema_id = t.schema_id
  ${TABLE_SIZE_APPLY}
  WHERE s.name = ? AND t.name = ?`;

export const TABLE_COLUMNS_QUERY = `
  SELECT
    c.name AS column_name,
    c.column_id,
    ty.name AS type_name,
    c.max_length,
    c.precision,
    c.scale,
    c.is_nullable,
    c.is_identity,
    c.is_computed,
    CAST(ic.seed_value AS NVARCHAR(64)) AS identity_seed,
    CAST(ic.increment_value AS NVARCHAR(64)) AS identity_increment,
    cc.definition AS computed_definition,
    dc.name AS default_name,
    dc.definition AS default_value,
    CAST(ep.value AS NVARCHAR(4000)) AS column_comment,
    fk.fk_text,
    fk.on_delete,
    fk.on_update
  FROM sys.columns c
  JOIN sys.tables t ON t.object_id = c.object_id
  JOIN sys.schemas s ON s.schema_id = t.schema_id
  JOIN sys.types ty ON ty.user_type_id = c.user_type_id
  LEFT JOIN sys.identity_columns ic ON ic.object_id = c.object_id AND ic.column_id = c.column_id
  LEFT JOIN sys.computed_columns cc ON cc.object_id = c.object_id AND cc.column_id = c.column_id
  LEFT JOIN sys.default_constraints dc ON dc.object_id = c.default_object_id
  LEFT JOIN sys.extended_properties ep
    ON ep.class = 1 AND ep.major_id = c.object_id AND ep.minor_id = c.column_id
    AND ep.name = 'MS_Description'
  OUTER APPLY (
    SELECT
      STRING_AGG(N'→ ' + rt.name + N'.' + rc.name, CHAR(10)) AS fk_text,
      MAX(REPLACE(f.delete_referential_action_desc, '_', ' ')) AS on_delete,
      MAX(REPLACE(f.update_referential_action_desc, '_', ' ')) AS on_update
    FROM sys.foreign_key_columns fkc
    JOIN sys.foreign_keys f ON f.object_id = fkc.constraint_object_id
    JOIN sys.tables rt ON rt.object_id = fkc.referenced_object_id
    JOIN sys.columns rc ON rc.object_id = fkc.referenced_object_id AND rc.column_id = fkc.referenced_column_id
    WHERE fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
  ) fk
  WHERE s.name = ? AND t.name = ?
  ORDER BY c.column_id`;

export const TABLE_INDEXES_QUERY = `
  SELECT
    i.name AS index_name,
    i.is_unique,
    i.is_primary_key,
    i.is_unique_constraint,
    i.type_desc,
    STRING_AGG(
      CASE WHEN ic.is_included_column = 0
        THEN QUOTENAME(c.name) + CASE WHEN ic.is_descending_key = 1 THEN ' DESC' ELSE ' ASC' END
      END,
      ', '
    ) WITHIN GROUP (ORDER BY ic.key_ordinal) AS key_columns,
    STRING_AGG(
      CASE WHEN ic.is_included_column = 1 THEN QUOTENAME(c.name) END,
      ', '
    ) AS included_columns,
    i.filter_definition
  FROM sys.indexes i
  JOIN sys.tables t ON t.object_id = i.object_id
  JOIN sys.schemas s ON s.schema_id = t.schema_id
  JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
  JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
  WHERE s.name = ? AND t.name = ? AND i.index_id > 0
  GROUP BY i.name, i.is_unique, i.is_primary_key, i.is_unique_constraint, i.type_desc, i.filter_definition
  ORDER BY i.name`;

export const TABLE_CHECKS_QUERY = `
  SELECT ck.name, ck.definition
  FROM sys.check_constraints ck
  JOIN sys.tables t ON t.object_id = ck.parent_object_id
  JOIN sys.schemas s ON s.schema_id = t.schema_id
  WHERE s.name = ? AND t.name = ?
  ORDER BY ck.name`;

export const TABLE_FOREIGN_KEYS_QUERY = `
  SELECT
    f.name,
    STRING_AGG(QUOTENAME(pc.name), ', ') WITHIN GROUP (ORDER BY fkc.constraint_column_id) AS columns,
    QUOTENAME(rs.name) + '.' + QUOTENAME(rt.name) AS referenced_table,
    STRING_AGG(QUOTENAME(rc.name), ', ') WITHIN GROUP (ORDER BY fkc.constraint_column_id) AS referenced_columns,
    REPLACE(f.delete_referential_action_desc, '_', ' ') AS on_delete,
    REPLACE(f.update_referential_action_desc, '_', ' ') AS on_update
  FROM sys.foreign_keys f
  JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = f.object_id
  JOIN sys.tables t ON t.object_id = f.parent_object_id
  JOIN sys.schemas s ON s.schema_id = t.schema_id
  JOIN sys.columns pc ON pc.object_id = fkc.parent_object_id AND pc.column_id = fkc.parent_column_id
  JOIN sys.tables rt ON rt.object_id = fkc.referenced_object_id
  JOIN sys.schemas rs ON rs.schema_id = rt.schema_id
  JOIN sys.columns rc ON rc.object_id = fkc.referenced_object_id AND rc.column_id = fkc.referenced_column_id
  WHERE s.name = ? AND t.name = ?
  GROUP BY f.name, rs.name, rt.name, f.delete_referential_action_desc, f.update_referential_action_desc
  ORDER BY f.name`;

export const TABLE_TRIGGERS_QUERY = `
  SELECT
    tr.name AS trigger_name,
    tr.is_disabled,
    tr.is_instead_of_trigger,
    (
      SELECT STRING_AGG(te.type_desc, ',')
      FROM sys.trigger_events te
      WHERE te.object_id = tr.object_id
    ) AS events,
    OBJECT_DEFINITION(tr.object_id) AS definition
  FROM sys.triggers tr
  JOIN sys.tables t ON t.object_id = tr.parent_id
  JOIN sys.schemas s ON s.schema_id = t.schema_id
  WHERE s.name = ? AND t.name = ?
  ORDER BY tr.name`;
