/**
 * API: Export Database
 * Uses pg-dump-restore to export PostgreSQL database
 */
import { createReadStream, promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  pgDump,
  FormatEnum,
  type ConnectionOptions,
  type DumpOptionsType,
} from 'pg-dump-restore';
import type { ExportDatabaseRequest, ExportFormat } from '~/shared/types';

/**
 * Map export format to pg_dump FormatEnum
 */
const formatMap: Record<ExportFormat, FormatEnum> = {
  plain: FormatEnum.Plain,
  custom: FormatEnum.Custom,
  directory: FormatEnum.Directory,
  tar: FormatEnum.Tar,
};

/**
 * Get file extension based on format
 */
const getFileExtension = (format: ExportFormat): string => {
  switch (format) {
    case 'plain':
      return '.sql';
    case 'custom':
      return '.dump';
    case 'tar':
      return '.tar';
    case 'directory':
      return ''; // Directory doesn't have extension
    default:
      return '.sql';
  }
};

/**
 * Parse connection string to ConnectionOptions
 */
const parseConnectionString = (connString: string): ConnectionOptions => {
  const url = new URL(connString);

  return {
    host: url.hostname,
    port: parseInt(url.port || '5432', 10),
    database: url.pathname.slice(1), // Remove leading slash
    username: url.username,
    password: url.password,
  };
};

export default defineEventHandler(async event => {
  const body: ExportDatabaseRequest = await readBody(event);

  const { dbConnectionString, databaseName, options } = body;

  if (!dbConnectionString) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Database connection string is required',
    });
  }

  // Generate unique filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const extension = getFileExtension(options.format);
  const fileName = `${databaseName}_${timestamp}${extension}`;
  const outputPath = join(tmpdir(), fileName);

  try {
    // Parse connection string
    const connectionOptions = parseConnectionString(dbConnectionString);

    // Build pg_dump options
    const dumpOptions: DumpOptionsType = {
      filePath: outputPath,
      format: formatMap[options.format],
    };

    // Schema-only or data-only
    if (options.scope === 'schema-only') {
      dumpOptions.schemaOnly = true;
    } else if (options.scope === 'data-only') {
      dumpOptions.dataOnly = true;
    }

    // Specific schemas
    if (options.schemas && options.schemas.length > 0) {
      dumpOptions.schemaPattern = options.schemas;
    }

    // Specific tables
    if (options.tables && options.tables.length > 0) {
      dumpOptions.tablePattern = options.tables;
    }

    // Additional options
    if (options.noOwner) {
      dumpOptions.noOwner = true;
    }

    if (options.noPrivileges) {
      dumpOptions.noPrivileges = true;
    }

    if (options.clean) {
      dumpOptions.clean = true;
    }

    if (options.createDb) {
      dumpOptions.create = true;
    }

    // Compression (for custom/directory formats)
    if (
      options.compressLevel !== undefined &&
      (options.format === 'custom' || options.format === 'directory')
    ) {
      dumpOptions.compress = options.compressLevel;
    }

    // Parallel jobs (directory format only)
    if (options.format === 'directory' && options.jobs) {
      dumpOptions.jobs = options.jobs;
    }

    // Execute pg_dump
    const startTime = Date.now();
    await pgDump(connectionOptions, dumpOptions);
    const duration = Date.now() - startTime;

    // Get file stats
    const stats = await fs.stat(outputPath);

    // Set response headers for file download
    setHeader(event, 'Content-Type', 'application/octet-stream');
    setHeader(
      event,
      'Content-Disposition',
      `attachment; filename="${fileName}"`
    );
    setHeader(event, 'Content-Length', stats.size);
    setHeader(event, 'X-Export-Duration', String(duration));
    setHeader(event, 'X-Export-FileName', fileName);

    // Stream file to response
    const fileStream = createReadStream(outputPath);

    // Clean up file after streaming
    fileStream.on('end', async () => {
      try {
        await fs.unlink(outputPath);
      } catch {
        // Ignore cleanup errors
      }
    });

    return sendStream(event, fileStream);
  } catch (error) {
    console.log('🚀 ~ error:', error);
    // Clean up on error
    try {
      await fs.unlink(outputPath);
    } catch {
      // Ignore cleanup errors
    }

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    // Check for common pg_dump errors
    if (errorMessage.includes('pg_dump')) {
      throw createError({
        statusCode: 500,
        statusMessage: `pg_dump error: ${errorMessage}. Make sure pg_dump is installed and accessible.`,
      });
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Export failed: ${errorMessage}`,
    });
  }
});
