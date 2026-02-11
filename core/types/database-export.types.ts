/**
 * Database Export Types
 * Used for PostgreSQL database export functionality
 */

// ============================================================================
// Export Configuration Types
// ============================================================================

/**
 * pg_dump output format
 * - plain: Plain SQL script (.sql)
 * - custom: Custom compressed format (.dump) - supports pg_restore
 * - directory: Directory format - enables parallel dump
 * - tar: Tar archive format (.tar)
 */
export type ExportFormat = 'plain' | 'custom' | 'directory' | 'tar';

/**
 * Export scope options
 */
export type ExportScope = 'full' | 'schema-only' | 'data-only';

/**
 * Export options for pg_dump
 */
export interface ExportOptions {
  /** Output format */
  format: ExportFormat;

  /** Export scope (full, schema-only, data-only) */
  scope: ExportScope;

  /** Specific schemas to export (optional) */
  schemas?: string[];

  /** Specific tables to export (optional) */
  tables?: string[];

  /** Compression level 0-9 (0 = no compression) */
  compressLevel?: number;

  /** Omit ownership/privileges statements */
  noOwner?: boolean;

  /** Omit privilege (GRANT/REVOKE) statements */
  noPrivileges?: boolean;

  /** Add DROP statements before CREATE */
  clean?: boolean;

  /** Add CREATE DATABASE statement */
  createDb?: boolean;

  /** Number of parallel jobs (directory format only) */
  jobs?: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request body for database export
 */
export interface ExportDatabaseRequest {
  dbConnectionString: string;
  databaseName: string;
  options: ExportOptions;
}

/**
 * Response for database export (streaming)
 */
export interface ExportDatabaseResponse {
  success: boolean;
  fileName: string;
  fileSize?: number;
  duration?: number;
  error?: string;
}

/**
 * Export progress event
 */
export interface ExportProgress {
  status: 'starting' | 'dumping' | 'compressing' | 'complete' | 'error';
  progress?: number; // 0-100
  message?: string;
}

// ============================================================================
// Import Configuration Types
// ============================================================================

/**
 * Import format - matches pg_restore supported formats
 */
export type ImportFormat = 'plain' | 'custom' | 'tar';

/**
 * Import options for pg_restore
 */
export interface ImportOptions {
  /** Target schema (optional - defaults to original) */
  targetSchema?: string;

  /** Omit ownership statements */
  noOwner?: boolean;

  /** Omit privilege (GRANT/REVOKE) statements */
  noPrivileges?: boolean;

  /** Clean (drop) database objects before recreating */
  clean?: boolean;

  /** Create the database before restoring */
  createDb?: boolean;

  /** Only restore data, not schema */
  dataOnly?: boolean;

  /** Only restore schema, not data */
  schemaOnly?: boolean;

  /** Number of parallel jobs */
  jobs?: number;

  /** Exit on error */
  exitOnError?: boolean;
}

/**
 * Request body for database import
 */
export interface ImportDatabaseRequest {
  dbConnectionString: string;
  options: ImportOptions;
  // File is sent as multipart form data
}

/**
 * Response for database import
 */
export interface ImportDatabaseResponse {
  success: boolean;
  message: string;
  duration?: number;
  error?: string;
}
