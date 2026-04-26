import { createError } from 'h3';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createReadStream, createWriteStream } from 'node:fs';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  DatabaseTransferJobSnapshot,
  DatabaseTransferJobStage,
  ExportOptions,
  ImportOptions,
} from '~/core/types';
import type {
  ISSLConfig,
  ISSHConfig,
} from '~/core/types/entities/connection.entity';
import { createSshTunnel } from '~/server/utils/ssh-tunnel';
import { createTableAdapter } from '../adapters/tables';
import {
  assertNativeBackupSupported,
  buildNativeBackupFileName,
  getNativeBackupCapability,
  getNativeBackupFileKind,
  getNativeBackupImportTool,
  resolveNativeExportFormat,
  type NativeBackupToolName,
} from './native-backup';

const NATIVE_BACKUP_TTL_MS = 30 * 60 * 1000;

const DEFAULT_PORTS: Partial<Record<DatabaseClientType, number>> = {
  [DatabaseClientType.POSTGRES]: 5432,
  [DatabaseClientType.MYSQL]: 3306,
  [DatabaseClientType.MARIADB]: 3306,
  [DatabaseClientType.SQLITE3]: 0,
};

type NativeBackupConnectionParams = {
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

type ExportJobParams = NativeBackupConnectionParams & {
  options: ExportOptions;
};

type ImportJobParams = NativeBackupConnectionParams & {
  options: ImportOptions;
  fileData: Buffer;
  uploadFileName: string;
};

type PreparedImportJobParams = NativeBackupConnectionParams & {
  options: ImportOptions;
  uploadPath: string;
  uploadFileName: string;
};

type TempSslFiles = {
  caPath?: string;
  certPath?: string;
  keyPath?: string;
};

type ResolvedCliConnection = {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  filePath?: string;
  ssl?: ISSLConfig;
  sslFiles?: TempSslFiles;
  closeTunnel?: () => Promise<void>;
};

type NativeBackupJobRecord = DatabaseTransferJobSnapshot & {
  artifactPath?: string;
  artifactContentType?: string;
  tempDir: string;
  uploadPath?: string;
  cleanupTimer?: ReturnType<typeof setTimeout>;
};

const nativeBackupJobs = new Map<string, NativeBackupJobRecord>();

function getDefaultPort(type: DatabaseClientType) {
  return DEFAULT_PORTS[type] ?? 5432;
}

function resolveDatabaseName(params: NativeBackupConnectionParams) {
  return (
    params.databaseName ||
    params.database ||
    params.serviceName ||
    params.username ||
    (params.filePath ? basename(params.filePath) : '') ||
    'database'
  );
}

function parseConnectionString(
  connectionString: string,
  type: DatabaseClientType
) {
  if (!connectionString) {
    return {};
  }

  const url = new URL(connectionString);
  const pathname = url.pathname.replace(/^\/+/, '');

  return {
    host: url.hostname,
    port: parseInt(url.port || `${getDefaultPort(type)}`, 10),
    username: decodeURIComponent(url.username || ''),
    password: decodeURIComponent(url.password || ''),
    database: pathname,
  };
}

async function writeSslFiles(tempDir: string, ssl?: ISSLConfig) {
  if (!ssl?.mode || ssl.mode === 'disable') {
    return undefined;
  }

  const sslDir = join(tempDir, 'ssl');
  const files: TempSslFiles = {};

  await mkdir(sslDir, { recursive: true });

  if (ssl.ca) {
    files.caPath = join(sslDir, 'ca.pem');
  }

  if (ssl.cert) {
    files.certPath = join(sslDir, 'client-cert.pem');
  }

  if (ssl.key) {
    files.keyPath = join(sslDir, 'client-key.pem');
  }

  await Promise.all(
    [
      files.caPath ? writeFile(files.caPath, ssl.ca || '', 'utf8') : undefined,
      files.certPath
        ? writeFile(files.certPath, ssl.cert || '', 'utf8')
        : undefined,
      files.keyPath
        ? writeFile(files.keyPath, ssl.key || '', 'utf8')
        : undefined,
    ].filter(Boolean) as Promise<unknown>[]
  );

  return files;
}

async function resolveCliConnection(
  params: NativeBackupConnectionParams,
  tempDir: string
): Promise<ResolvedCliConnection> {
  const type = params.type;

  if (!type) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Database type is required for native backup jobs.',
    });
  }

  if (type === DatabaseClientType.SQLITE3) {
    if (!params.filePath) {
      throw createError({
        statusCode: 400,
        statusMessage: 'SQLite native backup requires a file path.',
      });
    }

    return {
      filePath: params.filePath,
    };
  }

  const fromUrl = parseConnectionString(params.dbConnectionString, type);
  const host = params.host || fromUrl.host;
  const port = parseInt(
    params.port || `${fromUrl.port || getDefaultPort(type)}`,
    10
  );
  const username = params.username || fromUrl.username;
  const password = params.password || fromUrl.password;
  const database = params.serviceName || params.database || fromUrl.database;

  if (!host) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Host is required for native backup jobs.',
    });
  }

  let finalHost = host;
  let finalPort = port;
  let closeTunnel: (() => Promise<void>) | undefined;

  if (params.ssh?.enabled) {
    const tunnel = await createSshTunnel(params.ssh, host, port);
    finalHost = tunnel.localHost;
    finalPort = tunnel.localPort;
    closeTunnel = tunnel.close;
  }

  return {
    host: finalHost,
    port: finalPort,
    username,
    password,
    database,
    ssl: params.ssl,
    sslFiles: await writeSslFiles(tempDir, params.ssl),
    closeTunnel,
  };
}

function parseHumanBytes(value?: string | number | null) {
  if (typeof value === 'number') {
    return value;
  }

  if (!value) {
    return null;
  }

  const match = value.trim().match(/^([\d.]+)\s*([KMGT]?B)$/i);

  if (!match) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const numericValue = Number(match[1]);
  const unit = match[2].toUpperCase();
  const multiplier =
    {
      B: 1,
      KB: 1024,
      MB: 1024 ** 2,
      GB: 1024 ** 3,
      TB: 1024 ** 4,
    }[unit] || 1;

  return Math.round(numericValue * multiplier);
}

function resolveDefaultSchemas(
  type: DatabaseClientType,
  params: NativeBackupConnectionParams
) {
  switch (type) {
    case DatabaseClientType.POSTGRES:
      return ['public'];
    case DatabaseClientType.MYSQL:
    case DatabaseClientType.MARIADB:
      return [params.database || resolveDatabaseName(params)];
    default:
      return [];
  }
}

async function estimateExportBytes(params: ExportJobParams) {
  if (!params.type) {
    return undefined;
  }

  if (params.type === DatabaseClientType.SQLITE3 && params.filePath) {
    try {
      const fileStat = await stat(params.filePath);
      return fileStat.size;
    } catch {
      return undefined;
    }
  }

  try {
    const tableAdapter = await createTableAdapter(params.type, params);
    const schemas =
      params.options.schemas?.length &&
      params.type === DatabaseClientType.POSTGRES
        ? params.options.schemas
        : resolveDefaultSchemas(params.type, params);

    let totalBytes = 0;

    for (const schema of schemas) {
      const tables = await tableAdapter.getOverviewTables(schema);

      tables.forEach(table => {
        totalBytes += parseHumanBytes(table.total_size) || 0;
      });
    }

    return totalBytes || undefined;
  } catch {
    return undefined;
  }
}

function getMysqlSslMode(mode?: ISSLConfig['mode']) {
  switch (mode) {
    case 'preferred':
      return 'PREFERRED';
    case 'require':
      return 'REQUIRED';
    case 'verify-ca':
      return 'VERIFY_CA';
    case 'verify-full':
      return 'VERIFY_IDENTITY';
    default:
      return undefined;
  }
}

function buildPostgresEnv(connection: ResolvedCliConnection) {
  return {
    ...process.env,
    ...(connection.password ? { PGPASSWORD: connection.password } : {}),
    ...(connection.ssl?.mode && connection.ssl.mode !== 'disable'
      ? { PGSSLMODE: connection.ssl.mode }
      : {}),
    ...(connection.sslFiles?.caPath
      ? { PGSSLROOTCERT: connection.sslFiles.caPath }
      : {}),
    ...(connection.sslFiles?.certPath
      ? { PGSSLCERT: connection.sslFiles.certPath }
      : {}),
    ...(connection.sslFiles?.keyPath
      ? { PGSSLKEY: connection.sslFiles.keyPath }
      : {}),
  };
}

function buildMysqlEnv(connection: ResolvedCliConnection) {
  return {
    ...process.env,
    ...(connection.password ? { MYSQL_PWD: connection.password } : {}),
  };
}

function appendMysqlSslArgs(args: string[], connection: ResolvedCliConnection) {
  const sslMode = getMysqlSslMode(connection.ssl?.mode);

  if (sslMode) {
    args.push(`--ssl-mode=${sslMode}`);
  }

  if (connection.sslFiles?.caPath) {
    args.push(`--ssl-ca=${connection.sslFiles.caPath}`);
  }

  if (connection.sslFiles?.certPath) {
    args.push(`--ssl-cert=${connection.sslFiles.certPath}`);
  }

  if (connection.sslFiles?.keyPath) {
    args.push(`--ssl-key=${connection.sslFiles.keyPath}`);
  }
}

function toDbProgress(
  bytesProcessed: number,
  bytesTotal?: number,
  min = 15,
  max = 90
) {
  if (!bytesTotal || bytesTotal <= 0) {
    return null;
  }

  const ratio = Math.max(0, Math.min(bytesProcessed / bytesTotal, 1));
  return Math.round(min + ratio * (max - min));
}

function createMissingCommandError(command: string) {
  const error = new Error(
    `${command} is not installed on the runtime host.`
  ) as Error & {
    cliCode?: string;
  };

  error.cliCode = 'CLI_NOT_FOUND';
  return error;
}

function isMissingCommandError(error: unknown) {
  return (
    error instanceof Error &&
    (error as Error & { cliCode?: string }).cliCode === 'CLI_NOT_FOUND'
  );
}

function collectLines(onLine?: (line: string) => void) {
  let buffer = '';

  return (chunk: Buffer | string) => {
    buffer += chunk.toString();

    while (buffer.includes('\n')) {
      const newLineIndex = buffer.indexOf('\n');
      const line = buffer.slice(0, newLineIndex).trim();
      buffer = buffer.slice(newLineIndex + 1);

      if (line) {
        onLine?.(line);
      }
    }
  };
}

async function runCommandToFile({
  command,
  args,
  env,
  outputPath,
  onBytes,
  onStderrLine,
}: {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  outputPath: string;
  onBytes?: (bytes: number) => void;
  onStderrLine?: (line: string) => void;
}) {
  const child = spawn(command, args, {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const output = createWriteStream(outputPath);
  const parseStderr = collectLines(onStderrLine);
  let stderr = '';
  let writtenBytes = 0;

  child.stdout?.on('data', chunk => {
    writtenBytes += chunk.length;
    onBytes?.(writtenBytes);
    output.write(chunk);
  });

  child.stderr?.on('data', chunk => {
    stderr += chunk.toString();
    parseStderr(chunk);
  });

  const code = await new Promise<number | null>((resolve, reject) => {
    child.once('close', exitCode => resolve(exitCode));
    child.once('error', error => {
      reject(
        (error as NodeJS.ErrnoException).code === 'ENOENT'
          ? createMissingCommandError(command)
          : error
      );
    });
    output.once('error', error => {
      child.kill('SIGTERM');
      reject(error);
    });
  });

  output.end();
  await once(output, 'finish');

  if (code !== 0) {
    throw new Error(stderr.trim() || `${command} exited with code ${code}`);
  }

  return {
    bytesWritten: writtenBytes,
    stderr: stderr.trim(),
  };
}

async function runCommandWithInputFile({
  command,
  args,
  env,
  inputPath,
  onBytes,
  onStderrLine,
}: {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  inputPath: string;
  onBytes?: (bytes: number) => void;
  onStderrLine?: (line: string) => void;
}) {
  const child = spawn(command, args, {
    env,
    stdio: ['pipe', 'ignore', 'pipe'],
  });
  const input = createReadStream(inputPath);
  const parseStderr = collectLines(onStderrLine);
  let stderr = '';
  let streamedBytes = 0;

  input.on('data', chunk => {
    streamedBytes += chunk.length;
    onBytes?.(streamedBytes);
  });

  input.on('error', error => {
    child.stdin?.destroy(error);
  });

  child.stderr?.on('data', chunk => {
    stderr += chunk.toString();
    parseStderr(chunk);
  });

  input.pipe(child.stdin!);

  const code = await new Promise<number | null>((resolve, reject) => {
    child.once('close', exitCode => resolve(exitCode));
    child.once('error', error => {
      reject(
        (error as NodeJS.ErrnoException).code === 'ENOENT'
          ? createMissingCommandError(command)
          : error
      );
    });
    input.once('error', error => {
      child.kill('SIGTERM');
      reject(error);
    });
  });

  if (code !== 0) {
    throw new Error(stderr.trim() || `${command} exited with code ${code}`);
  }

  return {
    bytesRead: streamedBytes,
    stderr: stderr.trim(),
  };
}

async function runCommandCapture({
  command,
  args,
  env,
  onStderrLine,
}: {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  onStderrLine?: (line: string) => void;
}) {
  const child = spawn(command, args, {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  const parseStderr = collectLines(onStderrLine);

  child.stdout?.on('data', chunk => {
    stdout += chunk.toString();
  });

  child.stderr?.on('data', chunk => {
    stderr += chunk.toString();
    parseStderr(chunk);
  });

  const closePromise = once(child, 'close') as Promise<[number | null]>;
  const errorPromise = once(child, 'error').catch(() => null);
  const result = await Promise.race([
    closePromise.then(([code]) => ({ code })),
    errorPromise.then(value => {
      if (!value) {
        return Promise.reject(new Error('Unknown command failure.'));
      }

      const [error] = value;

      return Promise.reject(
        (error as NodeJS.ErrnoException).code === 'ENOENT'
          ? createMissingCommandError(command)
          : error
      );
    }),
  ]);

  if (result.code !== 0) {
    throw new Error(
      stderr.trim() || `${command} exited with code ${result.code}`
    );
  }

  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

function updateJob(jobId: string, patch: Partial<NativeBackupJobRecord>) {
  const current = nativeBackupJobs.get(jobId);

  if (!current) {
    return;
  }

  nativeBackupJobs.set(jobId, {
    ...current,
    ...patch,
  });
}

function getJob(jobId: string) {
  return nativeBackupJobs.get(jobId);
}

function scheduleCleanup(jobId: string) {
  const record = getJob(jobId);

  if (!record) {
    return;
  }

  record.cleanupTimer?.refresh?.();

  if (record.cleanupTimer) {
    clearTimeout(record.cleanupTimer);
  }

  const timer = setTimeout(() => {
    void destroyNativeBackupJob(jobId);
  }, NATIVE_BACKUP_TTL_MS);

  timer.unref?.();
  updateJob(jobId, { cleanupTimer: timer });
}

async function destroyNativeBackupJob(jobId: string) {
  const record = getJob(jobId);

  if (!record) {
    return;
  }

  if (record.cleanupTimer) {
    clearTimeout(record.cleanupTimer);
  }

  nativeBackupJobs.delete(jobId);
  await rm(record.tempDir, { recursive: true, force: true });
}

function quoteMysqlIdentifier(identifier: string) {
  return `\`${identifier.replace(/`/g, '``')}\``;
}

async function maybeResetMysqlDatabase(
  connection: ResolvedCliConnection,
  options: ImportOptions
) {
  if (!options.clean || options.dataOnly || !connection.database) {
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
    command: 'mysql',
    args,
    env: buildMysqlEnv(connection),
  });
}

async function maybeResetSqliteDatabase(
  connection: ResolvedCliConnection,
  options: ImportOptions
) {
  if (!options.clean || options.dataOnly || !connection.filePath) {
    return;
  }

  await rm(connection.filePath, { force: true });
}

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

async function runPostgresExport(
  command: NativeBackupToolName,
  connection: ResolvedCliConnection,
  params: ExportJobParams,
  artifactPath: string,
  estimatedBytes: number | undefined,
  updateProgress: (
    progress: number | null,
    message: string,
    bytes?: number
  ) => void
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
    command,
    args,
    env: buildPostgresEnv(connection),
    outputPath: artifactPath,
    onBytes: bytesWritten => {
      updateProgress(
        toDbProgress(bytesWritten, estimatedBytes),
        `Streaming ${command} ${isPlainSql ? 'SQL script' : 'archive'}...`,
        bytesWritten
      );
    },
    onStderrLine: line => {
      updateProgress(null, line);
    },
  });
}

function getMysqlExportCandidates(params: ExportJobParams) {
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

async function runMysqlExport(
  command: NativeBackupToolName,
  connection: ResolvedCliConnection,
  params: ExportJobParams,
  artifactPath: string,
  estimatedBytes: number | undefined,
  updateProgress: (
    progress: number | null,
    message: string,
    bytes?: number
  ) => void
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

  if (command === 'mysqlpump') {
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
    command,
    args,
    env: buildMysqlEnv(connection),
    outputPath: artifactPath,
    onBytes: bytesWritten => {
      updateProgress(
        toDbProgress(bytesWritten, estimatedBytes),
        `Streaming ${command} SQL dump...`,
        bytesWritten
      );
    },
    onStderrLine: line => {
      updateProgress(null, line);
    },
  });
}

async function runSqliteExport(
  command: NativeBackupToolName,
  connection: ResolvedCliConnection,
  params: ExportJobParams,
  artifactPath: string,
  estimatedBytes: number | undefined,
  updateProgress: (
    progress: number | null,
    message: string,
    bytes?: number
  ) => void
) {
  const dumpCommand =
    params.options.scope === 'schema-only' ? '.schema' : '.dump';
  const args = [connection.filePath || '', dumpCommand];

  if (params.options.tables?.length) {
    args.push(...params.options.tables);
  }

  await runCommandToFile({
    command,
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

async function runPostgresImport(
  command: NativeBackupToolName,
  connection: ResolvedCliConnection,
  params: PreparedImportJobParams,
  updateProgress: (
    progress: number | null,
    message: string,
    bytes?: number
  ) => void
) {
  const env = buildPostgresEnv(connection);

  if (command === 'psql') {
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
      command,
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
    command: 'pg_restore',
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
    command: 'pg_restore',
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

async function runMysqlImport(
  connection: ResolvedCliConnection,
  params: PreparedImportJobParams,
  updateProgress: (
    progress: number | null,
    message: string,
    bytes?: number
  ) => void
) {
  await maybeResetMysqlDatabase(connection, params.options);
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
    command: 'mysql',
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

async function runSqliteImport(
  connection: ResolvedCliConnection,
  params: PreparedImportJobParams,
  updateProgress: (
    progress: number | null,
    message: string,
    bytes?: number
  ) => void
) {
  await maybeResetSqliteDatabase(connection, params.options);
  const fileStat = await stat(params.uploadPath);

  await runCommandWithInputFile({
    command: 'sqlite3',
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

async function withCommandFallback<T>(
  candidates: NativeBackupToolName[],
  run: (command: NativeBackupToolName) => Promise<T>
) {
  let lastMissingError: Error | null = null;

  for (const command of candidates) {
    try {
      return await run(command);
    } catch (error) {
      if (isMissingCommandError(error)) {
        lastMissingError = error as Error;
        continue;
      }

      throw error;
    }
  }

  throw (
    lastMissingError ||
    new Error('No supported native backup tool is available.')
  );
}

function createJobRecord(
  jobId: string,
  operation: 'export' | 'import',
  type: DatabaseClientType,
  tempDir: string,
  tool: string
): NativeBackupJobRecord {
  return {
    jobId,
    operation,
    status: 'queued',
    stage: 'queued',
    databaseType: type,
    tool,
    progress: 0,
    message: 'Queued',
    startedAt: new Date().toISOString(),
    tempDir,
  };
}

async function runNativeExportJob(jobId: string, params: ExportJobParams) {
  const record = getJob(jobId);

  if (!record || !params.type) {
    return;
  }

  const startedAt = Date.now();
  let connection: ResolvedCliConnection | null = null;

  try {
    updateJob(jobId, {
      status: 'running',
      stage: 'preparing',
      progress: 5,
      message: 'Preparing native backup job...',
    });

    connection = await resolveCliConnection(params, record.tempDir);
    const estimatedBytes = await estimateExportBytes(params);
    const capability = getNativeBackupCapability(params.type);

    await withCommandFallback(
      params.type === DatabaseClientType.MYSQL ||
        params.type === DatabaseClientType.MARIADB
        ? getMysqlExportCandidates(params)
        : capability.exportToolCandidates,
      async command => {
        updateJob(jobId, {
          stage: 'starting',
          progress: 10,
          tool: command,
          message: `Starting ${command}...`,
        });

        if (params.type === DatabaseClientType.POSTGRES) {
          await runPostgresExport(
            command,
            connection!,
            params,
            record.artifactPath || '',
            estimatedBytes,
            (progress, message, bytes) => {
              const previousProgress = getJob(jobId)?.progress ?? null;

              updateJob(jobId, {
                stage: 'dumping',
                progress: progress ?? previousProgress,
                bytesProcessed: bytes,
                bytesTotal: estimatedBytes,
                message,
              });
            }
          );
          return;
        }

        if (
          params.type === DatabaseClientType.MYSQL ||
          params.type === DatabaseClientType.MARIADB
        ) {
          await runMysqlExport(
            command,
            connection!,
            params,
            record.artifactPath || '',
            estimatedBytes,
            (progress, message, bytes) => {
              const previousProgress = getJob(jobId)?.progress ?? null;

              updateJob(jobId, {
                stage: 'dumping',
                progress: progress ?? previousProgress,
                bytesProcessed: bytes,
                bytesTotal: estimatedBytes,
                message,
              });
            }
          );
          return;
        }

        if (params.type === DatabaseClientType.SQLITE3) {
          await runSqliteExport(
            command,
            connection!,
            params,
            record.artifactPath || '',
            estimatedBytes,
            (progress, message, bytes) => {
              const previousProgress = getJob(jobId)?.progress ?? null;

              updateJob(jobId, {
                stage: 'dumping',
                progress: progress ?? previousProgress,
                bytesProcessed: bytes,
                bytesTotal: estimatedBytes,
                message,
              });
            }
          );
          return;
        }
      }
    );

    const fileStat = await stat(record.artifactPath || '');
    updateJob(jobId, {
      status: 'completed',
      stage: 'completed',
      progress: 100,
      bytesProcessed: fileStat.size,
      bytesTotal: fileStat.size,
      message: `Backup is ready. ${fileStat.size} bytes generated.`,
      completedAt: new Date().toISOString(),
      duration: Date.now() - startedAt,
      downloadReady: true,
      downloadUrl: `/api/database-export/jobs/${jobId}/download`,
    });
  } catch (error) {
    updateJob(jobId, {
      status: 'error',
      stage: 'error',
      progress: null,
      error: error instanceof Error ? error.message : 'Export failed.',
      message: error instanceof Error ? error.message : 'Export failed.',
      completedAt: new Date().toISOString(),
      duration: Date.now() - startedAt,
    });
  } finally {
    await connection?.closeTunnel?.();
    scheduleCleanup(jobId);
  }
}

async function runNativeImportJob(
  jobId: string,
  params: PreparedImportJobParams
) {
  const record = getJob(jobId);

  if (!record || !params.type) {
    return;
  }

  const startedAt = Date.now();
  let connection: ResolvedCliConnection | null = null;

  try {
    updateJob(jobId, {
      status: 'running',
      stage: 'preparing',
      progress: 5,
      message: 'Preparing native restore job...',
    });

    connection = await resolveCliConnection(params, record.tempDir);
    const capability = getNativeBackupCapability(params.type);
    const importToolCandidates =
      params.type === DatabaseClientType.POSTGRES
        ? [getNativeBackupImportTool(params.type, params.uploadFileName)]
        : capability.importToolCandidates;

    await withCommandFallback(importToolCandidates, async command => {
      updateJob(jobId, {
        stage: 'starting',
        progress: 10,
        tool: command,
        message: `Starting ${command}...`,
      });

      if (params.type === DatabaseClientType.POSTGRES) {
        await runPostgresImport(
          command,
          connection!,
          params,
          (progress, message, bytes) => {
            const previousProgress = getJob(jobId)?.progress ?? null;

            updateJob(jobId, {
              stage: 'restoring',
              progress: progress ?? previousProgress,
              bytesProcessed: bytes,
              message,
            });
          }
        );
        return;
      }

      if (
        params.type === DatabaseClientType.MYSQL ||
        params.type === DatabaseClientType.MARIADB
      ) {
        await runMysqlImport(
          connection!,
          params,
          (progress, message, bytes) => {
            const previousProgress = getJob(jobId)?.progress ?? null;

            updateJob(jobId, {
              stage: 'restoring',
              progress: progress ?? previousProgress,
              bytesProcessed: bytes,
              message,
            });
          }
        );
        return;
      }

      if (params.type === DatabaseClientType.SQLITE3) {
        await runSqliteImport(
          connection!,
          params,
          (progress, message, bytes) => {
            const previousProgress = getJob(jobId)?.progress ?? null;

            updateJob(jobId, {
              stage: 'restoring',
              progress: progress ?? previousProgress,
              bytesProcessed: bytes,
              message,
            });
          }
        );
      }
    });

    updateJob(jobId, {
      status: 'completed',
      stage: 'completed',
      progress: 100,
      message: `${params.uploadFileName} restored successfully.`,
      completedAt: new Date().toISOString(),
      duration: Date.now() - startedAt,
    });
  } catch (error) {
    updateJob(jobId, {
      status: 'error',
      stage: 'error',
      progress: null,
      error: error instanceof Error ? error.message : 'Import failed.',
      message: error instanceof Error ? error.message : 'Import failed.',
      completedAt: new Date().toISOString(),
      duration: Date.now() - startedAt,
    });
  } finally {
    await connection?.closeTunnel?.();
    scheduleCleanup(jobId);
  }
}

export async function startNativeExportJob(params: ExportJobParams) {
  assertNativeBackupSupported(params.type);

  const tempDir = await mkdtemp(join(tmpdir(), 'heraq-native-export-'));
  const jobId = randomUUID();
  const artifactName = buildNativeBackupFileName(
    resolveDatabaseName(params),
    params.type,
    new Date(),
    params.options.format
  );
  const fileKind = getNativeBackupFileKind(params.type, params.options.format);
  const record = createJobRecord(
    jobId,
    'export',
    params.type,
    tempDir,
    'pending'
  );

  nativeBackupJobs.set(jobId, {
    ...record,
    artifactPath: join(tempDir, artifactName),
    artifactContentType:
      fileKind === 'sql'
        ? 'application/sql; charset=utf-8'
        : 'application/octet-stream',
    downloadFileName: artifactName,
  });

  void runNativeExportJob(jobId, params);

  return {
    jobId,
    statusUrl: `/api/database-export/jobs/${jobId}`,
    downloadUrl: `/api/database-export/jobs/${jobId}/download`,
  };
}

export async function startNativeImportJob(params: ImportJobParams) {
  assertNativeBackupSupported(params.type);

  const tempDir = await mkdtemp(join(tmpdir(), 'heraq-native-import-'));
  const jobId = randomUUID();
  const uploadPath = join(tempDir, params.uploadFileName);
  const record = createJobRecord(
    jobId,
    'import',
    params.type,
    tempDir,
    'pending'
  );

  await writeFile(uploadPath, params.fileData);

  nativeBackupJobs.set(jobId, {
    ...record,
    uploadPath,
  });

  void runNativeImportJob(jobId, {
    ...params,
    uploadPath,
  });

  return {
    jobId,
    statusUrl: `/api/database-import/jobs/${jobId}`,
  };
}

export function getNativeBackupJobSnapshot(jobId: string) {
  const record = getJob(jobId);

  if (!record) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Backup job not found or has expired.',
    });
  }

  return {
    jobId: record.jobId,
    operation: record.operation,
    status: record.status,
    stage: record.stage,
    databaseType: record.databaseType,
    tool: record.tool,
    progress: record.progress,
    message: record.message,
    bytesProcessed: record.bytesProcessed,
    bytesTotal: record.bytesTotal,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    duration: record.duration,
    downloadReady: record.downloadReady,
    downloadFileName: record.downloadFileName,
    downloadUrl: record.downloadUrl,
    warnings: record.warnings,
    error: record.error,
  } satisfies DatabaseTransferJobSnapshot;
}

export function getNativeExportDownload(jobId: string) {
  const record = getJob(jobId);

  if (!record || record.operation !== 'export' || !record.artifactPath) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Export artifact not found or has expired.',
    });
  }

  if (record.status !== 'completed') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Export artifact is not ready yet.',
    });
  }

  return {
    filePath: record.artifactPath,
    fileName: record.downloadFileName || basename(record.artifactPath),
    contentType: record.artifactContentType || 'application/octet-stream',
  };
}
