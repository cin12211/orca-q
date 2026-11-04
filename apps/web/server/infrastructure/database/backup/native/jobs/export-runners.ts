import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  getNativeBackupCapability,
  resolveNativeExportFormat,
} from '../../native-backup';
import {
  appendMysqlSslArgs,
  buildMysqlEnv,
  buildPostgresEnv,
  resolveDatabaseName,
  toDbProgress,
} from './connection';
import { runCommandToFile } from './process';
import type {
  ExportJobParams,
  JobProgressUpdater,
  ResolvedCliConnection,
  ResolvedNativeToolInvocation,
} from './types';

async function maybeFilterSqliteDumpForDataOnly(outputPath: string) {
  const content = await readFile(outputPath, 'utf8');
  const filtered = content
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();

      return (
        trimmed === 'PRAGMA foreign_keys=OFF;' ||
        trimmed === 'BEGIN TRANSACTION;' ||
        trimmed === 'COMMIT;' ||
        trimmed.startsWith('INSERT INTO ')
      );
    })
    .join('\n');

  await writeFile(outputPath, `${filtered}\n`, 'utf8');
}

export async function runPostgresExport(
  invocation: ResolvedNativeToolInvocation,
  connection: ResolvedCliConnection,
  params: ExportJobParams,
  artifactPath: string,
  estimatedBytes: number | undefined,
  updateProgress: JobProgressUpdater
) {
  const exportFormat = resolveNativeExportFormat(
    DatabaseClientType.POSTGRES,
    params.options.format
  );
  const isPlainSql = exportFormat === 'plain';
  const args = [
    '--verbose',
    `--format=${isPlainSql ? 'plain' : 'custom'}`,
    '--host',
    connection.host || '127.0.0.1',
    '--port',
    String(connection.port || 5432),
    '--username',
    connection.username || '',
    '--dbname',
    connection.database || resolveDatabaseName(params),
  ];

  if (params.options.scope === 'schema-only') {
    args.push('--schema-only');
  }

  if (params.options.scope === 'data-only') {
    args.push('--data-only');
  }

  (params.options.schemas || []).forEach(schema => {
    args.push('--schema', schema);
  });

  (params.options.tables || []).forEach(table => {
    args.push('--table', table);
  });

  if (params.options.noOwner) {
    args.push('--no-owner');
  }

  if (params.options.noPrivileges) {
    args.push('--no-privileges');
  }

  if (params.options.clean) {
    args.push('--clean');
  }

  if (params.options.createDb) {
    args.push('--create');
  }

  await runCommandToFile({
    command: invocation.command,
    args,
    env: buildPostgresEnv(connection),
    outputPath: artifactPath,
    onBytes: bytesWritten => {
      updateProgress(
        toDbProgress(bytesWritten, estimatedBytes),
        `Streaming ${invocation.tool} ${isPlainSql ? 'SQL script' : 'archive'}...`,
        bytesWritten
      );
    },
    onStderrLine: line => {
      updateProgress(null, line);
    },
  });
}

export function getMysqlExportCandidates(params: ExportJobParams) {
  const capability = getNativeBackupCapability(params.type);

  if (
    params.options.scope !== 'full' ||
    (params.options.tables?.length || 0) > 0 ||
    params.options.schemas?.length
  ) {
    return capability.exportToolCandidates.filter(tool => tool === 'mysqldump');
  }

  return capability.exportToolCandidates;
}

export async function runMysqlExport(
  invocation: ResolvedNativeToolInvocation,
  connection: ResolvedCliConnection,
  params: ExportJobParams,
  artifactPath: string,
  estimatedBytes: number | undefined,
  updateProgress: JobProgressUpdater
) {
  const database = connection.database || resolveDatabaseName(params);
  const args = [
    '--protocol=TCP',
    '--host',
    connection.host || '127.0.0.1',
    '--port',
    String(connection.port || 3306),
    '--user',
    connection.username || '',
  ];

  appendMysqlSslArgs(args, connection);

  if (invocation.tool === 'mysqlpump') {
    args.push('--default-parallelism=2');
  } else {
    args.push('--single-transaction', '--routines', '--triggers', '--events');
  }

  if (params.options.scope === 'schema-only') {
    args.push('--no-data');
  }

  if (params.options.scope === 'data-only') {
    args.push('--no-create-info');
  }

  if (params.options.clean) {
    args.push('--add-drop-table');
  }

  if (params.options.createDb || !params.options.tables?.length) {
    args.push('--databases', database);
  } else {
    args.push(database);
  }

  (params.options.tables || []).forEach(table => {
    args.push(table);
  });

  await runCommandToFile({
    command: invocation.command,
    args,
    env: buildMysqlEnv(connection),
    outputPath: artifactPath,
    onBytes: bytesWritten => {
      updateProgress(
        toDbProgress(bytesWritten, estimatedBytes),
        `Streaming ${invocation.tool} SQL dump...`,
        bytesWritten
      );
    },
    onStderrLine: line => {
      updateProgress(null, line);
    },
  });
}

export async function runSqliteExport(
  invocation: ResolvedNativeToolInvocation,
  connection: ResolvedCliConnection,
  params: ExportJobParams,
  artifactPath: string,
  estimatedBytes: number | undefined,
  updateProgress: JobProgressUpdater
) {
  const dumpCommand =
    params.options.scope === 'schema-only' ? '.schema' : '.dump';
  const args = [connection.filePath || '', dumpCommand];

  if (params.options.tables?.length) {
    args.push(...params.options.tables);
  }

  await runCommandToFile({
    command: invocation.command,
    args,
    env: process.env,
    outputPath: artifactPath,
    onBytes: bytesWritten => {
      updateProgress(
        toDbProgress(bytesWritten, estimatedBytes),
        'Streaming sqlite3 dump...',
        bytesWritten
      );
    },
  });

  if (params.options.scope === 'data-only') {
    updateProgress(92, 'Filtering SQLite dump to INSERT statements only...');
    await maybeFilterSqliteDumpForDataOnly(artifactPath);
  }
}
