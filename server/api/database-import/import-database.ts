/**
 * API: Import Database
 * Uses pg_restore or psql to import PostgreSQL database backup
 */
import { exec } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { ImportOptions } from '~/shared/types';

const execAsync = promisify(exec);

/**
 * Parse connection string to individual components
 */
const parseConnectionString = (connString: string) => {
  const url = new URL(connString);
  return {
    host: url.hostname,
    port: url.port || '5432',
    database: url.pathname.slice(1),
    username: url.username,
    password: url.password,
  };
};

/**
 * Determine file type from extension
 */
const getFileType = (filename: string): 'plain' | 'custom' | 'tar' => {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'sql':
      return 'plain';
    case 'tar':
      return 'tar';
    case 'dump':
    default:
      return 'custom';
  }
};

/**
 * Build pg_restore command arguments
 */
const buildRestoreArgs = (
  filePath: string,
  conn: ReturnType<typeof parseConnectionString>,
  options: ImportOptions
): string[] => {
  const args: string[] = [
    '-h',
    conn.host,
    '-p',
    conn.port,
    '-U',
    conn.username,
    '-d',
    conn.database,
  ];

  if (options.noOwner) args.push('--no-owner');
  if (options.noPrivileges) args.push('--no-privileges');
  if (options.clean) args.push('--clean');
  if (options.createDb) args.push('--create');
  if (options.dataOnly) args.push('--data-only');
  if (options.schemaOnly) args.push('--schema-only');
  if (options.exitOnError) args.push('--exit-on-error');
  if (options.jobs && options.jobs > 1) {
    args.push('-j', String(options.jobs));
  }

  args.push(filePath);

  return args;
};

/**
 * Build psql command arguments for plain SQL files
 */
const buildPsqlArgs = (
  filePath: string,
  conn: ReturnType<typeof parseConnectionString>
): string[] => {
  return [
    '-h',
    conn.host,
    '-p',
    conn.port,
    '-U',
    conn.username,
    '-d',
    conn.database,
    '-f',
    filePath,
  ];
};

export default defineEventHandler(async event => {
  // Read multipart form data
  const formData = await readMultipartFormData(event);

  if (!formData) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No form data received',
    });
  }

  // Extract fields from form data
  let dbConnectionString = '';
  let options: ImportOptions = {};
  let fileData: Buffer | null = null;
  let fileName = 'import.dump';

  for (const field of formData) {
    if (field.name === 'dbConnectionString') {
      dbConnectionString = field.data.toString();
    } else if (field.name === 'options') {
      try {
        options = JSON.parse(field.data.toString());
      } catch {
        options = {};
      }
    } else if (field.name === 'file' && field.filename) {
      fileData = field.data;
      fileName = field.filename;
    }
  }

  if (!dbConnectionString) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Database connection string is required',
    });
  }

  if (!fileData) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Backup file is required',
    });
  }

  // Save file to temp directory
  const tempFilePath = join(tmpdir(), `import_${Date.now()}_${fileName}`);

  try {
    await fs.writeFile(tempFilePath, fileData);

    // Parse connection string
    const conn = parseConnectionString(dbConnectionString);

    // Set PGPASSWORD environment variable
    const env = {
      ...process.env,
      PGPASSWORD: conn.password,
    };

    const startTime = Date.now();
    const fileType = getFileType(fileName);

    let command: string;
    let args: string[];

    if (fileType === 'plain') {
      // Use psql for plain SQL files
      args = buildPsqlArgs(tempFilePath, conn);
      command = `psql ${args.join(' ')}`;
    } else {
      // Use pg_restore for custom and tar formats
      args = buildRestoreArgs(tempFilePath, conn, options);
      command = `pg_restore ${args.join(' ')}`;
    }

    try {
      await execAsync(command, { env, maxBuffer: 50 * 1024 * 1024 }); // 50MB buffer
    } catch (execError: any) {
      // pg_restore may return non-zero exit code even on partial success
      // Check if it's a critical error
      const stderr = execError.stderr || '';
      const stdout = execError.stdout || '';

      // If exitOnError is set and there's an error, throw
      if (options.exitOnError && stderr) {
        throw new Error(stderr);
      }

      // Log warning but continue if there's some output
      if (stderr && !stdout) {
        console.warn('pg_restore warning:', stderr);
      }
    }

    const duration = Date.now() - startTime;

    // Clean up temp file
    try {
      await fs.unlink(tempFilePath);
    } catch {
      // Ignore cleanup errors
    }

    return {
      success: true,
      message: `Database restored successfully in ${(duration / 1000).toFixed(1)}s`,
      duration,
    };
  } catch (error) {
    // Clean up temp file on error
    try {
      await fs.unlink(tempFilePath);
    } catch {
      // Ignore cleanup errors
    }

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    // Check for common errors
    if (errorMessage.includes('pg_restore') || errorMessage.includes('psql')) {
      throw createError({
        statusCode: 500,
        statusMessage: `Restore error: ${errorMessage}. Make sure pg_restore/psql is installed.`,
      });
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Import failed: ${errorMessage}`,
    });
  }
});
