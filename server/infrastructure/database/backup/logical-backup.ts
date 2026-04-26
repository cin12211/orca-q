import { createError } from 'h3';
import { basename } from 'node:path';
import { Readable } from 'node:stream';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  ExportOptions,
  ImportOptions,
  TableStructure,
} from '~/core/types';
import type {
  ISSLConfig,
  ISSHConfig,
} from '~/core/types/entities/connection.entity';
import { getDatabaseSource } from '~/server/infrastructure/driver/db-connection';
import { createTableAdapter } from '../adapters/tables';

const SUPPORTED_LOGICAL_BACKUP_TYPES = new Set<DatabaseClientType>([
  DatabaseClientType.POSTGRES,
  DatabaseClientType.MYSQL,
  DatabaseClientType.MARIADB,
  DatabaseClientType.SQLITE3,
  DatabaseClientType.ORACLE,
]);

const LOGICAL_BACKUP_VERSION = 1;
const LOGICAL_BACKUP_KIND = 'heraq-logical-backup';
const INSERT_BATCH_SIZE = 250;

type BackupConnectionParams = {
  dbConnectionString: string;
  databaseName?: string;
  type?: DatabaseClientType;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  serviceName?: string;
  filePath?: string;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
};

type LogicalBackupTable = {
  schema: string;
  name: string;
  kind: string;
  owner: string | null;
  comment: string | null;
  dependencies: string[];
  rowCount: number;
  ddl?: string;
  rows?: Record<string, unknown>[];
};

export type LogicalDatabaseBackup = {
  version: number;
  kind: typeof LOGICAL_BACKUP_KIND;
  exportedAt: string;
  dbType: DatabaseClientType;
  databaseName: string;
  scope: ExportOptions['scope'];
  tables: LogicalBackupTable[];
};

function assertSupportedDbType(
  type?: DatabaseClientType
): asserts type is DatabaseClientType {
  if (!type) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Database type is required for backup operations.',
    });
  }

  if (!SUPPORTED_LOGICAL_BACKUP_TYPES.has(type)) {
    throw createError({
      statusCode: 501,
      statusMessage: `${type} logical backup is not available. Supported database types: postgres, mysql, mariadb, sqlite3, oracledb.`,
    });
  }
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeIdentifier(identifier: string) {
  return identifier.replace(/^"+|"+$/g, '').trim();
}

function buildTableKey(schema: string, tableName: string) {
  return `${normalizeIdentifier(schema)}.${normalizeIdentifier(tableName)}`;
}

function safeFileNameSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-+/g, '-');
}

function resolveDatabaseName(params: BackupConnectionParams) {
  return (
    params.databaseName ||
    params.database ||
    params.serviceName ||
    params.username ||
    (params.filePath ? basename(params.filePath) : '') ||
    'database'
  );
}

function resolveDefaultSchemas(
  type: DatabaseClientType,
  params: BackupConnectionParams
) {
  switch (type) {
    case DatabaseClientType.POSTGRES:
      return ['public'];
    case DatabaseClientType.MYSQL:
    case DatabaseClientType.MARIADB:
      return unique([params.database || resolveDatabaseName(params)]);
    case DatabaseClientType.SQLITE3:
      return ['main'];
    case DatabaseClientType.ORACLE:
      return unique([
        (params.username || resolveDatabaseName(params)).toUpperCase(),
      ]);
    default:
      return [];
  }
}

function resolveRequestedSchemas(
  type: DatabaseClientType,
  params: BackupConnectionParams,
  options: ExportOptions
) {
  const selectedSchemas = unique(options.schemas || []);

  if (selectedSchemas.length) {
    return selectedSchemas;
  }

  const fallbackSchemas = resolveDefaultSchemas(type, params);

  if (!fallbackSchemas.length) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Unable to determine schemas to export. Select at least one schema before exporting.',
    });
  }

  return fallbackSchemas;
}

function parseDependencyReference(
  rawReference: string,
  fallbackSchema: string
) {
  const cleaned = rawReference.replace(/^[^\w"]+/, '').trim();

  if (!cleaned) {
    return null;
  }

  const beforeParen = cleaned.split('(')[0]?.trim() || cleaned;
  const hasParen = cleaned.includes('(');
  const segments = beforeParen
    .split('.')
    .map(segment => normalizeIdentifier(segment))
    .filter(Boolean);

  if (!segments.length) {
    return null;
  }

  if (hasParen) {
    if (segments.length === 1) {
      return buildTableKey(fallbackSchema, segments[0]);
    }

    return buildTableKey(segments[0], segments[1]);
  }

  if (segments.length === 1) {
    return buildTableKey(fallbackSchema, segments[0]);
  }

  if (segments.length === 2) {
    return buildTableKey(fallbackSchema, segments[0]);
  }

  return buildTableKey(segments[0], segments[1]);
}

function extractDependencies(structure: TableStructure[], schema: string) {
  const dependencies = new Set<string>();

  structure.forEach(column => {
    if (!column.foreign_keys) {
      return;
    }

    column.foreign_keys
      .split('\n')
      .map(reference => parseDependencyReference(reference, schema))
      .filter((value): value is string => Boolean(value))
      .forEach(reference => dependencies.add(reference));
  });

  return [...dependencies];
}

function serializeBackupValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return {
      __heraQType: 'buffer',
      base64: value.toString('base64'),
    };
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(item => serializeBackupValue(item));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(
        ([key, nestedValue]) => [key, serializeBackupValue(nestedValue)]
      )
    );
  }

  return value;
}

function deserializeBackupValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => deserializeBackupValue(item));
  }

  if (
    value &&
    typeof value === 'object' &&
    '__heraQType' in (value as Record<string, unknown>) &&
    (value as Record<string, unknown>).__heraQType === 'buffer'
  ) {
    const bufferValue = value as { base64?: string };
    return Buffer.from(bufferValue.base64 || '', 'base64');
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(
        ([key, nestedValue]) => [key, deserializeBackupValue(nestedValue)]
      )
    );
  }

  return value;
}

async function readResultRows(
  payload: unknown
): Promise<Record<string, unknown>[]> {
  if (payload instanceof Readable) {
    let content = '';

    for await (const chunk of payload) {
      content += chunk.toString();
    }

    if (!content.trim()) {
      return [];
    }

    const parsed = JSON.parse(content) as Record<string, unknown>[];
    return parsed.map(
      row => serializeBackupValue(row) as Record<string, unknown>
    );
  }

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map(
    row => serializeBackupValue(row) as Record<string, unknown>
  );
}

function topologicallySortTables(tables: LogicalBackupTable[]) {
  const orderIndex = new Map<string, number>();
  const nodes = new Map<string, LogicalBackupTable>();
  const dependents = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  tables.forEach((table, index) => {
    const key = buildTableKey(table.schema, table.name);
    orderIndex.set(key, index);
    nodes.set(key, table);
    inDegree.set(key, 0);
  });

  tables.forEach(table => {
    const tableKey = buildTableKey(table.schema, table.name);
    const filteredDependencies = unique(table.dependencies || []).filter(
      dependency => dependency !== tableKey && nodes.has(dependency)
    );

    inDegree.set(tableKey, filteredDependencies.length);

    filteredDependencies.forEach(dependency => {
      const currentDependents = dependents.get(dependency) || [];
      currentDependents.push(tableKey);
      dependents.set(dependency, currentDependents);
    });
  });

  const queue = [...nodes.keys()]
    .filter(key => (inDegree.get(key) || 0) === 0)
    .sort(
      (left, right) =>
        (orderIndex.get(left) || 0) - (orderIndex.get(right) || 0)
    );
  const resolvedKeys: string[] = [];

  while (queue.length) {
    const nextKey = queue.shift();

    if (!nextKey) {
      continue;
    }

    resolvedKeys.push(nextKey);

    (dependents.get(nextKey) || []).forEach(dependentKey => {
      const nextInDegree = (inDegree.get(dependentKey) || 0) - 1;
      inDegree.set(dependentKey, nextInDegree);

      if (nextInDegree === 0) {
        queue.push(dependentKey);
        queue.sort(
          (left, right) =>
            (orderIndex.get(left) || 0) - (orderIndex.get(right) || 0)
        );
      }
    });
  }

  if (resolvedKeys.length === tables.length) {
    return resolvedKeys.map(key => nodes.get(key)!);
  }

  const unresolvedKeys = [...nodes.keys()].filter(
    key => !resolvedKeys.includes(key)
  );

  unresolvedKeys.sort(
    (left, right) => (orderIndex.get(left) || 0) - (orderIndex.get(right) || 0)
  );

  return [...resolvedKeys, ...unresolvedKeys].map(key => nodes.get(key)!);
}

function chunkRows<T>(rows: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }

  return chunks;
}

function isLogicalBackup(value: unknown): value is LogicalDatabaseBackup {
  const backup = value as LogicalDatabaseBackup;

  return Boolean(
    backup &&
      backup.version === LOGICAL_BACKUP_VERSION &&
      backup.kind === LOGICAL_BACKUP_KIND &&
      backup.dbType &&
      Array.isArray(backup.tables)
  );
}

export async function buildLogicalBackup(
  params: BackupConnectionParams & {
    options: ExportOptions;
  }
) {
  assertSupportedDbType(params.type);

  const tableAdapter = await createTableAdapter(params.type, params);
  const databaseName = resolveDatabaseName(params);
  const requestedSchemas = resolveRequestedSchemas(
    params.type,
    params,
    params.options
  );
  const selectedTables = unique(params.options.tables || []);
  const tables: LogicalBackupTable[] = [];

  for (const schema of requestedSchemas) {
    const overviewTables = await tableAdapter.getOverviewTables(schema);

    for (const table of overviewTables) {
      if (selectedTables.length && !selectedTables.includes(table.name)) {
        continue;
      }

      const structure = await tableAdapter.getTableStructure(
        schema,
        table.name
      );
      const rows =
        params.options.scope === 'schema-only'
          ? undefined
          : await readResultRows(
              await tableAdapter.exportTableData(schema, table.name, 'json')
            );
      const ddl =
        params.options.scope === 'data-only'
          ? undefined
          : await tableAdapter.getTableDdl(schema, table.name);

      tables.push({
        schema,
        name: table.name,
        kind: table.kind,
        owner: table.owner || null,
        comment: table.comment || null,
        dependencies: extractDependencies(structure, schema),
        rowCount: rows?.length || 0,
        ddl,
        rows,
      });
    }
  }

  const backup: LogicalDatabaseBackup = {
    version: LOGICAL_BACKUP_VERSION,
    kind: LOGICAL_BACKUP_KIND,
    exportedAt: new Date().toISOString(),
    dbType: params.type,
    databaseName,
    scope: params.options.scope,
    tables,
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${safeFileNameSegment(databaseName)}_${timestamp}.heraq-db.json`;

  return {
    backup,
    content: JSON.stringify(backup, null, 2),
    fileName,
  };
}

export function parseLogicalBackup(content: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Invalid backup file. Only HeraQ logical backup JSON files are supported.',
    });
  }

  if (!isLogicalBackup(parsed)) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Invalid backup payload. The selected file is not a HeraQ logical backup.',
    });
  }

  assertSupportedDbType(parsed.dbType);

  return parsed;
}

async function loadExistingTables(
  type: DatabaseClientType,
  params: BackupConnectionParams,
  schemas: string[]
) {
  const tableAdapter = await createTableAdapter(type, params);
  const tableMap = new Map<string, Set<string>>();

  for (const schema of unique(schemas)) {
    try {
      const tables = await tableAdapter.getOverviewTables(schema);
      tableMap.set(
        schema,
        new Set(tables.map(table => normalizeIdentifier(table.name)))
      );
    } catch {
      tableMap.set(schema, new Set());
    }
  }

  return tableMap;
}

export async function restoreLogicalBackup(
  params: BackupConnectionParams & {
    options: ImportOptions;
    content: string;
  }
) {
  assertSupportedDbType(params.type);

  const backup = parseLogicalBackup(params.content);

  if (backup.dbType !== params.type) {
    throw createError({
      statusCode: 400,
      statusMessage: `Backup type mismatch. This connection uses ${params.type}, but the backup was created from ${backup.dbType}.`,
    });
  }

  const orderedTables = topologicallySortTables(backup.tables);
  const existingTables = await loadExistingTables(
    params.type,
    params,
    orderedTables.map(table => table.schema)
  );
  const adapter = await getDatabaseSource(params);
  const errors: string[] = [];

  const runOrCollect = async (label: string, action: () => Promise<void>) => {
    try {
      await action();
    } catch (error) {
      const message = error instanceof Error ? error.message : label;

      if (params.options.exitOnError !== false) {
        throw error;
      }

      errors.push(`${label}: ${message}`);
    }
  };

  if (!params.options.dataOnly) {
    for (const table of orderedTables) {
      if (!table.ddl) {
        continue;
      }

      const schemaTables =
        existingTables.get(table.schema) || new Set<string>();

      if (schemaTables.has(normalizeIdentifier(table.name))) {
        continue;
      }

      await runOrCollect(`create ${table.schema}.${table.name}`, async () => {
        await adapter.knex.raw(table.ddl!);
        schemaTables.add(normalizeIdentifier(table.name));
        existingTables.set(table.schema, schemaTables);
      });
    }
  }

  if (!params.options.schemaOnly) {
    if (params.options.clean) {
      for (const table of [...orderedTables].reverse()) {
        const schemaTables = existingTables.get(table.schema);

        if (!schemaTables?.has(normalizeIdentifier(table.name))) {
          continue;
        }

        await runOrCollect(`clean ${table.schema}.${table.name}`, async () => {
          await adapter.knex.withSchema(table.schema).table(table.name).del();
        });
      }
    }

    for (const table of orderedTables) {
      if (!table.rows?.length) {
        continue;
      }

      const schemaTables =
        existingTables.get(table.schema) || new Set<string>();

      if (!schemaTables.has(normalizeIdentifier(table.name))) {
        throw createError({
          statusCode: 400,
          statusMessage: `Target table ${table.schema}.${table.name} does not exist and could not be created from this backup.`,
        });
      }

      const restoredRows = table.rows.map(
        row => deserializeBackupValue(row) as Record<string, unknown>
      );

      for (const batch of chunkRows(restoredRows, INSERT_BATCH_SIZE)) {
        await runOrCollect(`insert ${table.schema}.${table.name}`, async () => {
          await adapter.knex
            .withSchema(table.schema)
            .table(table.name)
            .insert(batch);
        });
      }
    }
  }

  const restoredRows = orderedTables.reduce(
    (count, table) => count + (table.rows?.length || 0),
    0
  );
  const warningSuffix = errors.length
    ? ` Completed with ${errors.length} warning(s).`
    : '';

  return {
    success: true,
    message:
      `Restored ${orderedTables.length} table(s) and ${restoredRows} row(s) from ${backup.databaseName}.${warningSuffix}`.trim(),
    warnings: errors,
    backup,
  };
}
