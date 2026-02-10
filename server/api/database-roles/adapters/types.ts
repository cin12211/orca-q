/**
 * Database Role Adapter Interface
 * Defines the contract for database-specific implementations
 */
import type {
  DatabaseRole,
  ObjectPermission,
  RolePermissions,
  GrantRevokeResponse,
  ObjectType,
  PrivilegeType,
  DatabasePermission,
  DatabaseInfo,
  RoleInheritanceNode,
  CreateRoleRequest,
  SchemaInfo,
  SchemaObjects,
  BulkGrantRequest,
  BulkGrantResponse,
} from '~/shared/types';

export interface IDatabaseRoleAdapter {
  /**
   * Database type identifier
   */
  readonly dbType: string;

  /**
   * Fetch all database roles/users
   */
  getRole(roleName: string): Promise<DatabaseRole>;

  /**
   * Fetch all database roles/users
   */
  getRoles(): Promise<DatabaseRole[]>;

  /**
   * Fetch permissions for a specific role
   */
  getRolePermissions(roleName: string): Promise<RolePermissions>;

  /**
   * Grant permission to a role
   */
  grantPermission(params: {
    roleName: string;
    objectType: ObjectType;
    schemaName: string;
    objectName: string;
    privileges: PrivilegeType[];
  }): Promise<GrantRevokeResponse>;

  /**
   * Revoke permission from a role
   */
  revokePermission(params: {
    roleName: string;
    objectType: ObjectType;
    schemaName: string;
    objectName: string;
    privileges: PrivilegeType[];
  }): Promise<GrantRevokeResponse>;

  /**
   * Fetch database-level permissions for a role
   */
  getDatabasePermissions(roleName: string): Promise<DatabasePermission[]>;

  /**
   * Fetch inherited roles tree for a role
   */
  getRoleInheritance(roleName: string): Promise<RoleInheritanceNode[]>;

  /**
   * Fetch all databases (no role-specific permissions)
   */
  getDatabases(): Promise<DatabaseInfo[]>;

  /**
   * Create a new role/user
   */
  createRole(
    params: Omit<CreateRoleRequest, 'dbConnectionString'>
  ): Promise<GrantRevokeResponse>;

  /**
   * Delete a role/user
   */
  deleteRole(roleName: string): Promise<GrantRevokeResponse>;

  /**
   * Get all schemas in the connected database
   */
  getSchemas(): Promise<SchemaInfo[]>;

  /**
   * Get objects (tables, views, functions, sequences) in a schema
   */
  getSchemaObjects(schemaName: string): Promise<SchemaObjects>;

  /**
   * Bulk grant permissions (for wizard)
   */
  grantBulkPermissions(
    params: Omit<BulkGrantRequest, 'dbConnectionString'>
  ): Promise<BulkGrantResponse>;
}

/**
 * Parameters for creating a database role adapter
 */
export interface DatabaseRoleAdapterParams {
  dbConnectionString: string;
}
