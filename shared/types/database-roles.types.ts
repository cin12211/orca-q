/**
 * Database Roles & Permissions Types
 * Used for managing PostgreSQL users, roles, and their permissions
 */

// ============================================================================
// Role/User Types
// ============================================================================

/**
 * Represents a PostgreSQL role/user with metadata
 */
export interface DatabaseRole {
  roleName: string;
  roleOid: number;
  isSuperuser: boolean;
  canLogin: boolean;
  canCreateDb: boolean;
  canCreateRole: boolean;
  isReplication: boolean;
  connectionLimit: number;
  validUntil: string | null;
  memberOf: string[];
  comment: string | null;
}

/**
 * Role category for tree organization
 */
export enum RoleCategory {
  Superuser = 'superuser',
  User = 'user',
  Role = 'role',
}

// ============================================================================
// Permission Types
// ============================================================================

/**
 * PostgreSQL privilege types
 */
export type PrivilegeType =
  | 'SELECT'
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'
  | 'TRUNCATE'
  | 'REFERENCES'
  | 'TRIGGER'
  | 'USAGE'
  | 'CREATE'
  | 'EXECUTE'
  | 'ALL';

/**
 * Object types that can have permissions
 */
export type ObjectType = 'table' | 'schema' | 'function' | 'sequence' | 'view';

/**
 * Represents a permission on a database object
 */
export interface ObjectPermission {
  objectType: ObjectType;
  schemaName: string;
  objectName: string;
  privileges: PrivilegeType[];
  grantedBy: string;
  isGrantable: boolean;
}

/**
 * All permissions for a specific role
 */
export interface RolePermissions {
  roleName: string;
  tablePermissions: ObjectPermission[];
  schemaPermissions: ObjectPermission[];
  viewPermissions: ObjectPermission[];
  functionPermissions: ObjectPermission[];
}

// ============================================================================
// API Request Types
// ============================================================================

/**
 * Request body for fetching database roles
 */
export interface GetDatabaseRolesRequest {
  dbConnectionString: string;
}

/**
 * Request body for fetching role permissions
 */
export interface GetRolePermissionsRequest {
  dbConnectionString: string;
  roleName: string;
}

/**
 * Request body for granting/revoking permissions
 */
export interface GrantRevokeRequest {
  dbConnectionString: string;
  roleName: string;
  objectType: ObjectType;
  schemaName: string;
  objectName: string;
  privileges: PrivilegeType[];
}

/**
 * Response for grant/revoke operations
 */
export interface GrantRevokeResponse {
  success: boolean;
  message: string;
  sql: string;
}

// ============================================================================
// Database Permission Types (for hierarchical view)
// ============================================================================

/**
 * Database-level permission for a role
 */
export interface DatabasePermission {
  databaseName: string;
  databaseOid: number;
  canConnect: boolean;
  canCreate: boolean;
  canTemp: boolean;
}

/**
 * Basic database info (no role-specific permissions)
 */
export interface DatabaseInfo {
  databaseName: string;
  databaseOid: number;
}

/**
 * Role permissions including database-level access
 */
export interface RolePermissionsWithDatabases extends RolePermissions {
  databasePermissions: DatabasePermission[];
}

/**
 * Role inheritance tree node
 */
export interface RoleInheritanceNode {
  roleName: string;
  depth: number;
}

// ============================================================================
// Create/Delete Role Types
// ============================================================================

/**
 * Request for creating a new role
 */
export interface CreateRoleRequest {
  dbConnectionString: string;
  roleName: string;
  password?: string;
  canLogin: boolean;
  canCreateDb: boolean;
  canCreateRole: boolean;
  isReplication: boolean;
  connectionLimit?: number;
  validUntil?: string;
  memberOf?: string[];
  comment?: string;
}

/**
 * Request for deleting a role
 */
export interface DeleteRoleRequest {
  dbConnectionString: string;
  roleName: string;
}

// ============================================================================
// Schema & Object Permission Types (for wizard)
// ============================================================================

/**
 * Schema information with permission flags
 */
export interface SchemaInfo {
  schemaName: string;
  hasUsage?: boolean;
  hasCreate?: boolean;
}

/**
 * Function info with name and signature
 */
export interface FunctionInfo {
  name: string;
  signature: string;
}

/**
 * Objects within a schema
 */
export interface SchemaObjects {
  tables: string[];
  views: string[];
  functions: FunctionInfo[];
  sequences: string[];
}

/**
 * Database grant for bulk operations
 */
export interface DatabaseGrant {
  databaseName: string;
  privileges: PrivilegeType[];
}

/**
 * Schema grant for bulk operations
 */
export interface SchemaGrant {
  schemaName: string;
  privileges: ('USAGE' | 'CREATE')[];
}

/**
 * Object grant for bulk operations
 */
export interface ObjectGrant {
  objectType: ObjectType;
  schemaName: string;
  objectName?: string; // undefined = ALL objects
  privileges: PrivilegeType[];
  applyToFuture?: boolean; // ALTER DEFAULT PRIVILEGES
}

/**
 * Request for bulk granting permissions (wizard final step)
 */
export interface BulkGrantRequest {
  dbConnectionString: string;
  roleName: string;
  databaseGrants: DatabaseGrant[];
  schemaGrants: SchemaGrant[];
  objectGrants: ObjectGrant[];
}

/**
 * Result of a single grant operation in bulk
 */
export interface BulkGrantResult {
  success: boolean;
  sql: string;
  error?: string;
}

/**
 * Response for bulk grant operations
 */
export interface BulkGrantResponse {
  success: boolean;
  results: BulkGrantResult[];
  totalSucceeded: number;
  totalFailed: number;
}
