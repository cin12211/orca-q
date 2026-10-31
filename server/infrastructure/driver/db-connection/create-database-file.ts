import { createError } from 'h3';
import { existsSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { isDesktopRuntime } from '~/server/infrastructure/mcp/desktop-store';
import { createDuckDbFile } from '../duckdb.adapter';

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

/** Creates an empty database and returns its path; never touches an existing file. */
export async function createDatabaseFile(input: {
  type: DatabaseClientType;
  directory: string;
  fileName: string;
}): Promise<string> {
  // Writes to the machine running the server, so it stays off hosted deployments.
  if (!isDesktopRuntime()) {
    throw createError({
      statusCode: 403,
      message: 'Database files can be created only in the desktop app.',
    });
  }

  const fileName = resolveFileName(input.type, input.fileName);

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

  if (input.type === DatabaseClientType.DUCKDB) {
    await createDuckDbFile(filePath);
  } else {
    // SQLite treats a zero-byte file as an empty database.
    writeFileSync(filePath, '', { flag: 'wx' });
  }

  return filePath;
}
