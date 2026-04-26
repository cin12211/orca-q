import type {
  SchemaDiffResponse,
  SchemaGroupDiff,
  TableDiff,
  ColumnDiff,
  ForeignKeyDiff,
  ViewDiff,
  FunctionDiff,
  DiffStatus,
  SQLStatement,
} from '~/components/modules/database-tools';
import type {
  SchemaMetaData,
  SchemaColumnMetadata,
  SchemaForeignKeyMetadata,
} from '~/core/types';

// ─── Normalisation ─────────────────────────────────────────────────────────────

function normalizeType(rawType: string): string {
  return rawType
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/character varying/g, 'varchar')
    .replace(/integer/g, 'int')
    .replace(/boolean/g, 'bool')
    .trim();
}

function normalizeDefault(val: string | null): string | null {
  if (val === null) return null;
  const s = val.trim();
  // strip nextval sequences to make them comparable
  if (s.startsWith('nextval(')) return '__sequence__';
  return s;
}

// ─── Column diff ───────────────────────────────────────────────────────────────

function diffColumns(
  sourceMap: Record<string, SchemaColumnMetadata>,
  targetMap: Record<string, SchemaColumnMetadata>
): ColumnDiff[] {
  const allNames = new Set([
    ...Object.keys(sourceMap),
    ...Object.keys(targetMap),
  ]);
  const diffs: ColumnDiff[] = [];

  for (const name of allNames) {
    const src = sourceMap[name];
    const tgt = targetMap[name];

    if (!tgt) {
      diffs.push({ name, status: 'added', source: src });
    } else if (!src) {
      diffs.push({ name, status: 'removed', target: tgt });
    } else {
      const changes: Record<string, { from: unknown; to: unknown }> = {};

      const srcType = normalizeType(src.type);
      const tgtType = normalizeType(tgt.type);
      if (srcType !== tgtType) changes.type = { from: tgtType, to: srcType };

      if (src.is_nullable !== tgt.is_nullable)
        changes.nullable = { from: tgt.is_nullable, to: src.is_nullable };

      const srcDefault = normalizeDefault(src.default_value);
      const tgtDefault = normalizeDefault(tgt.default_value);
      if (srcDefault !== tgtDefault)
        changes.default = { from: tgtDefault, to: srcDefault };

      const status: DiffStatus =
        Object.keys(changes).length > 0 ? 'modified' : 'unchanged';
      diffs.push({ name, status, source: src, target: tgt, changes });
    }
  }

  return diffs.sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Foreign key diff ──────────────────────────────────────────────────────────

function diffForeignKeys(
  source: SchemaForeignKeyMetadata[],
  target: SchemaForeignKeyMetadata[]
): ForeignKeyDiff[] {
  const key = (fk: SchemaForeignKeyMetadata) =>
    `${fk.column}→${fk.referenced_table}.${fk.referenced_column}`;

  const srcMap = Object.fromEntries(source.map(fk => [key(fk), fk]));
  const tgtMap = Object.fromEntries(target.map(fk => [key(fk), fk]));
  const all = new Set([...Object.keys(srcMap), ...Object.keys(tgtMap)]);

  return [...all].map(k => ({
    key: k,
    status: !tgtMap[k] ? 'added' : !srcMap[k] ? 'removed' : 'unchanged',
    source: srcMap[k],
    target: tgtMap[k],
  }));
}

// ─── Table diff ────────────────────────────────────────────────────────────────

function diffTables(
  sourceMeta: SchemaMetaData,
  targetMeta: SchemaMetaData
): TableDiff[] {
  const srcTables = new Set(sourceMeta.tables || []);
  const tgtTables = new Set(targetMeta.tables || []);
  const all = new Set([...srcTables, ...tgtTables]);
  const diffs: TableDiff[] = [];

  for (const table of all) {
    const srcDetail = sourceMeta.table_details?.[table];
    const tgtDetail = targetMeta.table_details?.[table];

    if (!tgtTables.has(table)) {
      const columns = (srcDetail?.columns || []).map(c => ({
        name: c.name,
        status: 'added' as DiffStatus,
        source: c,
      }));
      diffs.push({
        name: table,
        schema: sourceMeta.name,
        status: 'added',
        columns,
        foreignKeys: [],
      });
    } else if (!srcTables.has(table)) {
      const columns = (tgtDetail?.columns || []).map(c => ({
        name: c.name,
        status: 'removed' as DiffStatus,
        target: c,
      }));
      diffs.push({
        name: table,
        schema: sourceMeta.name,
        status: 'removed',
        columns,
        foreignKeys: [],
      });
    } else {
      const srcColMap = Object.fromEntries(
        (srcDetail?.columns || []).map(c => [c.name, c])
      );
      const tgtColMap = Object.fromEntries(
        (tgtDetail?.columns || []).map(c => [c.name, c])
      );
      const columns = diffColumns(srcColMap, tgtColMap);
      const foreignKeys = diffForeignKeys(
        srcDetail?.foreign_keys || [],
        tgtDetail?.foreign_keys || []
      );

      const hasChanges =
        columns.some(c => c.status !== 'unchanged') ||
        foreignKeys.some(fk => fk.status !== 'unchanged');

      diffs.push({
        name: table,
        schema: sourceMeta.name,
        status: hasChanges ? 'modified' : 'unchanged',
        columns,
        foreignKeys,
      });
    }
  }

  return diffs.sort((a, b) => {
    const order = { added: 0, modified: 1, removed: 2, unchanged: 3 };
    const diff = order[a.status] - order[b.status];
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });
}

// ─── View diff ─────────────────────────────────────────────────────────────────

function diffViews(
  sourceMeta: SchemaMetaData,
  targetMeta: SchemaMetaData
): ViewDiff[] {
  const srcMap = new Map((sourceMeta.views || []).map(v => [v.name, v]));
  const tgtMap = new Map((targetMeta.views || []).map(v => [v.name, v]));
  const all = new Set([...srcMap.keys(), ...tgtMap.keys()]);
  const diffs: ViewDiff[] = [];

  for (const name of all) {
    const status: DiffStatus = !tgtMap.has(name)
      ? 'added'
      : !srcMap.has(name)
        ? 'removed'
        : 'unchanged';
    diffs.push({ name, schema: sourceMeta.name, status });
  }

  return diffs.sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Function diff ─────────────────────────────────────────────────────────────

function diffFunctions(
  sourceMeta: SchemaMetaData,
  targetMeta: SchemaMetaData
): FunctionDiff[] {
  const srcMap = new Map(
    (sourceMeta.functions || []).map(f => [`${f.name}(${f.parameters})`, f])
  );
  const tgtMap = new Map(
    (targetMeta.functions || []).map(f => [`${f.name}(${f.parameters})`, f])
  );
  const all = new Set([...srcMap.keys(), ...tgtMap.keys()]);
  const diffs: FunctionDiff[] = [];

  for (const key of all) {
    const status: DiffStatus = !tgtMap.has(key)
      ? 'added'
      : !srcMap.has(key)
        ? 'removed'
        : 'unchanged';
    const fn = srcMap.get(key) || tgtMap.get(key)!;
    diffs.push({
      name: fn.name,
      signature: key,
      schema: sourceMeta.name,
      status,
    });
  }

  return diffs.sort((a, b) => a.name.localeCompare(b.name));
}

// ─── SQL generation ────────────────────────────────────────────────────────────

function buildColumnDefinition(col: SchemaColumnMetadata): string {
  const nullable = col.is_nullable ? '' : ' NOT NULL';
  const def = col.default_value ? ` DEFAULT ${col.default_value}` : '';
  return `  "${col.name}" ${col.type}${nullable}${def}`;
}

function generateTableSQL(table: TableDiff, safeMode: boolean): SQLStatement[] {
  const stmts: SQLStatement[] = [];
  const qualifiedName = `"${table.schema}"."${table.name}"`;

  if (table.status === 'added') {
    const colDefs = table.columns
      .map(c => (c.source ? buildColumnDefinition(c.source) : ''))
      .filter(Boolean)
      .join(',\n');
    stmts.push({
      type: 'CREATE_TABLE',
      destructive: false,
      sql: `CREATE TABLE IF NOT EXISTS ${qualifiedName} (\n${colDefs}\n);`,
      description: `Create table ${table.name}`,
    });
    return stmts;
  }

  if (table.status === 'removed') {
    stmts.push({
      type: 'DROP_TABLE',
      destructive: true,
      sql: safeMode
        ? `-- SKIPPED (safe mode): DROP TABLE ${qualifiedName};`
        : `DROP TABLE IF EXISTS ${qualifiedName};`,
      description: `Drop table ${table.name}`,
    });
    return stmts;
  }

  if (table.status === 'modified') {
    for (const col of table.columns) {
      if (col.status === 'added' && col.source) {
        stmts.push({
          type: 'ADD_COLUMN',
          destructive: false,
          sql: `ALTER TABLE ${qualifiedName} ADD COLUMN "${col.name}" ${col.source.type}${col.source.is_nullable ? '' : ' NOT NULL'}${col.source.default_value ? ` DEFAULT ${col.source.default_value}` : ''};`,
          description: `Add column ${table.name}.${col.name}`,
        });
      } else if (col.status === 'removed') {
        stmts.push({
          type: 'DROP_COLUMN',
          destructive: true,
          sql: safeMode
            ? `-- SKIPPED (safe mode): ALTER TABLE ${qualifiedName} DROP COLUMN "${col.name}";`
            : `ALTER TABLE ${qualifiedName} DROP COLUMN "${col.name}";`,
          description: `Drop column ${table.name}.${col.name}`,
        });
      } else if (col.status === 'modified' && col.changes && col.source) {
        if (col.changes.type) {
          stmts.push({
            type: 'MODIFY_COLUMN',
            destructive: false,
            sql: `ALTER TABLE ${qualifiedName} ALTER COLUMN "${col.name}" TYPE ${col.source.type};`,
            description: `Change type of ${table.name}.${col.name} to ${col.source.type}`,
          });
        }
        if (col.changes.nullable !== undefined) {
          const constraint = col.source!.is_nullable
            ? 'DROP NOT NULL'
            : 'SET NOT NULL';
          stmts.push({
            type: 'MODIFY_COLUMN',
            destructive: !col.source!.is_nullable,
            sql: `ALTER TABLE ${qualifiedName} ALTER COLUMN "${col.name}" ${constraint};`,
            description: `Set nullable=${col.source!.is_nullable} for ${table.name}.${col.name}`,
          });
        }
      }
    }
  }

  return stmts;
}

// ─── Main export ───────────────────────────────────────────────────────────────

export function computeSchemaDiff(
  source: SchemaMetaData[],
  target: SchemaMetaData[],
  safeMode: boolean
): SchemaDiffResponse {
  const tgtMap = new Map(target.map(s => [s.name, s]));
  const srcMap = new Map(source.map(s => [s.name, s]));
  const allSchemas = new Set([...srcMap.keys(), ...tgtMap.keys()]);

  const groups: SchemaGroupDiff[] = [];
  const statements: SQLStatement[] = [];

  let added = 0;
  let removed = 0;
  let modified = 0;
  let unchanged = 0;

  for (const schemaName of allSchemas) {
    const src = srcMap.get(schemaName);
    const tgt = tgtMap.get(schemaName);

    const emptyMeta = (name: string): SchemaMetaData => ({
      name,
      tables: [],
      views: [],
      functions: [],
      table_details: {},
      view_details: {},
    });

    const tables = diffTables(
      src || emptyMeta(schemaName),
      tgt || emptyMeta(schemaName)
    );
    const views = diffViews(
      src || emptyMeta(schemaName),
      tgt || emptyMeta(schemaName)
    );
    const functions = diffFunctions(
      src || emptyMeta(schemaName),
      tgt || emptyMeta(schemaName)
    );

    for (const t of tables) {
      if (t.status === 'added') added++;
      else if (t.status === 'removed') removed++;
      else if (t.status === 'modified') modified++;
      else unchanged++;
      statements.push(...generateTableSQL(t, safeMode));
    }
    for (const v of views) {
      if (v.status === 'added') added++;
      else if (v.status === 'removed') removed++;
      else unchanged++;
    }
    for (const f of functions) {
      if (f.status === 'added') added++;
      else if (f.status === 'removed') removed++;
      else unchanged++;
    }

    groups.push({ name: schemaName, tables, views, functions });
  }

  const safeSql = statements
    .filter(s => !s.destructive || s.sql.startsWith('--'))
    .map(s => s.sql)
    .join('\n\n');

  const fullSql = statements.map(s => s.sql).join('\n\n');

  return {
    schemas: groups,
    summary: { added, removed, modified, unchanged },
    sql: { safe: safeSql, full: fullSql, statements },
  };
}
