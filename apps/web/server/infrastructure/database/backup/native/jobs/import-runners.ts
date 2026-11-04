import { rm, stat } from 'node:fs/promises';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  appendMysqlSslArgs,
  buildMysqlEnv,
  buildPostgresEnv,
  resolveDatabaseName,
  toDbProgress,
} from './connection';
import { runCommandCapture, runCommandWithInputFile } from './process';
import type {
  JobProgressUpdater,
  PreparedImportJobParams,
  ResolvedCliConnection,
  ResolvedNativeToolInvocation,
} from './types';

function quoteMysqlIdentifier(identifier: string) {
  return `\`${identifier.replace(/`/g, '``')}\``;
}

async function maybeResetMysqlDatabase(
  invocation: ResolvedNativeToolInvocation,
  connection: ResolvedCliConnection,
  params: PreparedImportJobParams
) {
  if (
    !params.options.clean ||
    params.options.dataOnly ||
    !connection.database
  ) {
    return;
  }

  const args = [
    '--protocol=TCP',
    '--host',
    connection.host || '127.0.0.1',
    '--port',
    String(connection.port || 3306),
    '--user',
    connection.username || '',
    '--execute',
    `DROP DATABASE IF EXISTS ${quoteMysqlIdentifier(connection.database)}; CREATE DATABASE ${quoteMysqlIdentifier(connection.database)};`,
  ];

  appendMysqlSslArgs(args, connection);

  await runCommandCapture({
    command: invocation.command,
    args,
    env: buildMysqlEnv(connection),
  });
}

async function maybeResetSqliteDatabase(
  connection: ResolvedCliConnection,
  params: PreparedImportJobParams
) {
  if (
    !params.options.clean ||
    params.options.dataOnly ||
    !connection.filePath
  ) {
    return;
  }

  await rm(connection.filePath, { force: true });
}

export async function runPostgresImport(
  invocation: ResolvedNativeToolInvocation,
  connection: ResolvedCliConnection,
  params: PreparedImportJobParams,
  updateProgress: JobProgressUpdater
) {
  const env = buildPostgresEnv(connection);

  if (invocation.tool === 'psql') {
    const fileStat = await stat(params.uploadPath);
    const args = [
      '--host',
      connection.host || '127.0.0.1',
      '--port',
      String(connection.port || 5432),
      '--username',
      connection.username || '',
      '--dbname',
      connection.database || resolveDatabaseName(params),
    ];

    if (params.options.exitOnError !== false) {
      args.push('--set', 'ON_ERROR_STOP=1');
    }

    await runCommandWithInputFile({
      command: invocation.command,
      args,
      env,
      inputPath: params.uploadPath,
      onBytes: bytesRead => {
        updateProgress(
          toDbProgress(bytesRead, fileStat.size),
          'Streaming SQL into psql...',
          bytesRead
        );
      },
      onStderrLine: line => {
        updateProgress(null, line);
      },
    });

    return;
  }

  const listArgs = ['--list', params.uploadPath];
  const { stdout } = await runCommandCapture({
    command: invocation.command,
    args: listArgs,
    env,
  });
  const estimatedSteps = Math.max(
    stdout.split('\n').filter(line => line.trim() && !line.startsWith(';'))
      .length,
    1
  );
  let processedSteps = 0;

  const args = [
    '--verbose',
    '--host',
    connection.host || '127.0.0.1',
    '--port',
    String(connection.port || 5432),
    '--username',
    connection.username || '',
    '--dbname',
    connection.database || resolveDatabaseName(params),
  ];

  if (params.options.clean) {
    args.push('--clean');
  }

  if (params.options.createDb) {
    args.push('--create');
  }

  if (params.options.dataOnly) {
    args.push('--data-only');
  }

  if (params.options.schemaOnly) {
    args.push('--schema-only');
  }

  if (params.options.exitOnError !== false) {
    args.push('--exit-on-error');
  }

  if (params.options.jobs && params.options.jobs > 1) {
    args.push('--jobs', String(params.options.jobs));
  }

  args.push(params.uploadPath);

  await runCommandCapture({
    command: invocation.command,
    args,
    env,
    onStderrLine: line => {
      processedSteps += 1;
      updateProgress(
        Math.min(95, Math.round(15 + (processedSteps / estimatedSteps) * 75)),
        line
      );
    },
  });

  updateProgress(95, `Processed ${estimatedSteps} pg_restore entries.`);
}

export async function runMysqlImport(
  invocation: ResolvedNativeToolInvocation,
  connection: ResolvedCliConnection,
  params: PreparedImportJobParams,
  updateProgress: JobProgressUpdater
) {
  await maybeResetMysqlDatabase(invocation, connection, params);
  const fileStat = await stat(params.uploadPath);
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

  if (connection.database) {
    args.push(connection.database);
  }

  await runCommandWithInputFile({
    command: invocation.command,
    args,
    env: buildMysqlEnv(connection),
    inputPath: params.uploadPath,
    onBytes: bytesRead => {
      updateProgress(
        toDbProgress(bytesRead, fileStat.size),
        'Streaming SQL into mysql...',
        bytesRead
      );
    },
    onStderrLine: line => {
      updateProgress(null, line);
    },
  });
}

export async function runSqliteImport(
  invocation: ResolvedNativeToolInvocation,
  connection: ResolvedCliConnection,
  params: PreparedImportJobParams,
  updateProgress: JobProgressUpdater
) {
  await maybeResetSqliteDatabase(connection, params);
  const fileStat = await stat(params.uploadPath);

  await runCommandWithInputFile({
    command: invocation.command,
    args: [connection.filePath || ''],
    env: process.env,
    inputPath: params.uploadPath,
    onBytes: bytesRead => {
      updateProgress(
        toDbProgress(bytesRead, fileStat.size),
        'Streaming SQL into sqlite3...',
        bytesRead
      );
    },
    onStderrLine: line => {
      updateProgress(null, line);
    },
  });
}
