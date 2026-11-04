import { DatabaseClientType } from '#shared/constants/database-client-type';
import {
  getDatabaseFileOptionFields,
  getDefaultDatabaseFileOptions,
  type DatabaseFileOptions,
} from '#shared/constants/database-file-options';
import { createError } from 'h3';
import { existsSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { isDesktopRuntime } from '~~/server/infrastructure/mcp/desktop-store';
import { createDuckDbFile } from '../duckdb.adapter';
import { SqliteAdapter } from '../sqlite.adapter';

const DEFAULT_EXTENSIONS: Partial<Record<DatabaseClientType, string>> = {
  [DatabaseClientType.SQLITE3]: '.sqlite',
  [DatabaseClientType.DUCKDB]: '.duckdb',
};

function resolveFileName(type: DatabaseClientType, fileName: string) {
  const extension = DEFAULT_EXTENSIONS[type];

  if (!extension) {
    throw createError({
      statusCode: 400,
      message: `${type} databases cannot be created as a file.`,
    });
  }

  const isPlainName =
    fileName === basename(fileName) &&
    !fileName.includes('\\') &&
    !fileName.startsWith('.');

  if (!isPlainName) {
    throw createError({
      statusCode: 400,
      message: 'The file name cannot contain a path.',
    });
  }

  return extname(fileName) ? fileName : `${fileName}${extension}`;
}

function resolveOptions(
  type: DatabaseClientType,
  options: DatabaseFileOptions = {}
): Required<DatabaseFileOptions> {
  const resolved = { ...getDefaultDatabaseFileOptions(type) };

  // Values end up in PRAGMA text, so only the offered choices may get through.
  for (const field of getDatabaseFileOptionFields(type)) {
    const value = options[field.key];

    if (value === undefined) {
      continue;
    }

    if (!field.choices.some(choice => choice.value === value)) {
      throw createError({
        statusCode: 400,
        message: `Unsupported ${field.label}: ${value}`,
      });
    }

    resolved[field.key] = value;
  }

  return resolved as Required<DatabaseFileOptions>;
}

async function createSqliteFile(
  filePath: string,
  options: Required<DatabaseFileOptions>
) {
  // SQLite treats a zero-byte file as an empty database.
  writeFileSync(filePath, '', { flag: 'wx' });

  const adapter = new SqliteAdapter({ filename: filePath });

  try {
    await adapter.rawQuery(`PRAGMA page_size = ${options.pageSize}`);
    await adapter.rawQuery(`PRAGMA encoding = '${options.encoding}'`);
    await adapter.rawQuery(`PRAGMA auto_vacuum = ${options.autoVacuum}`);
    // These settings only reach the file once its first page is written.
    await adapter.rawQuery('CREATE TABLE orcaq_file_init (id INTEGER)');
    await adapter.rawQuery('DROP TABLE orcaq_file_init');
    await adapter.rawQuery('VACUUM');
    await adapter.rawQuery(`PRAGMA journal_mode = ${options.journalMode}`);
  } finally {
    await adapter.destroy();
  }
}

/** Creates an empty database and returns its path; never touches an existing file. */
export async function createDatabaseFile(input: {
  type: DatabaseClientType;
  directory: string;
  fileName: string;
  options?: DatabaseFileOptions;
}): Promise<string> {
  // Writes to the machine running the server, so it stays off hosted deployments.
  if (!isDesktopRuntime()) {
    throw createError({
      statusCode: 403,
      message: 'Database files can be created only in the desktop app.',
    });
  }

  const fileName = resolveFileName(input.type, input.fileName);
  const options = resolveOptions(input.type, input.options);

  if (
    !existsSync(input.directory) ||
    !statSync(input.directory).isDirectory()
  ) {
    throw createError({
      statusCode: 400,
      message: `Folder was not found: ${input.directory}`,
    });
  }

  const filePath = join(input.directory, fileName);

  if (existsSync(filePath)) {
    throw createError({
      statusCode: 409,
      message: `A file named ${fileName} already exists in this folder.`,
    });
  }

  try {
    if (input.type === DatabaseClientType.DUCKDB) {
      await createDuckDbFile(filePath, options);
    } else {
      await createSqliteFile(filePath, options);
    }
  } catch (error) {
    // The existence check above guarantees this file is ours to remove.
    rmSync(filePath, { force: true });
    throw error;
  }

  return filePath;
}
