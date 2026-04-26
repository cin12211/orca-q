/**
 * Database backup/import types shared by server jobs and the UI.
 */

// ============================================================================
// Export Configuration Types
// ============================================================================

export type ExportFormat = 'native' | 'plain' | 'custom' | 'tar';

/**
 * Export scope options
 */
export type ExportScope = 'full' | 'schema-only' | 'data-only';

/**
 * Export options shared by all supported database families.
 * Some options apply only when the selected native tool supports them.
 */
export interface ExportOptions {
  /** Output format. Use native for the recommended vendor-specific artifact. */
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
}

export type DatabaseTransferOperation = 'export' | 'import';

export type DatabaseTransferJobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'error';

export type DatabaseTransferJobStage =
  | 'queued'
  | 'preparing'
  | 'starting'
  | 'dumping'
  | 'restoring'
  | 'downloading'
  | 'finalizing'
  | 'completed'
  | 'error';

export interface DatabaseTransferJobSnapshot {
  jobId: string;
  operation: DatabaseTransferOperation;
  status: DatabaseTransferJobStatus;
  stage: DatabaseTransferJobStage;
  databaseType: string;
  tool: string;
  progress: number | null;
  message: string;
  bytesProcessed?: number;
  bytesTotal?: number;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  downloadReady?: boolean;
  downloadFileName?: string;
  downloadUrl?: string;
  warnings?: string[];
  error?: string;
}

export interface StartDatabaseTransferResponse {
  jobId: string;
  statusUrl: string;
  downloadUrl?: string;
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

export type ExportDatabaseResponse = StartDatabaseTransferResponse;

export type ExportProgress = DatabaseTransferJobSnapshot;

// ============================================================================
// Import Configuration Types
// ============================================================================

export type ImportFormat = 'native' | 'plain' | 'custom' | 'tar';

/**
 * Import options. Unsupported flags are ignored by database families that do
 * not expose matching native restore switches.
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

export type ImportDatabaseResponse = StartDatabaseTransferResponse;
