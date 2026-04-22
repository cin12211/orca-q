import { createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  BulkGrantRequest,
  BulkGrantResponse,
  CreateRoleRequest,
  DatabaseInfo,
  DatabasePermission,
  DatabaseRole,
  GrantRevokeResponse,
  ObjectType,
  PrivilegeType,
  RoleInheritanceNode,
  RolePermissions,
  SchemaInfo,
  SchemaObjects,
} from '~/core/types';
import type { IDatabaseRoleAdapter } from '../types';

function getDatabaseLabel(dbType: DatabaseClientType): string {
  switch (dbType) {
    case DatabaseClientType.MYSQL:
      return 'MySQL';
    case DatabaseClientType.MARIADB:
      return 'MariaDB';
    case DatabaseClientType.ORACLE:
      return 'Oracle';
    case DatabaseClientType.SQLITE3:
      return 'SQLite';
    default:
      return dbType;
  }
}

export abstract class BaseUnsupportedRoleAdapter
  implements IDatabaseRoleAdapter
{
  abstract readonly dbType: DatabaseClientType;

  protected unsupported(operation: string): never {
    throw createError({
      statusCode: 501,
      statusMessage: `${getDatabaseLabel(this.dbType)} role management does not support ${operation}`,
      data: {
        dbType: this.dbType,
        feature: 'database-roles',
        operation,
      },
    });
  }

  async getRole(_roleName: string): Promise<DatabaseRole> {
    return this.unsupported('loading role details');
  }

  async getRoles(): Promise<DatabaseRole[]> {
    return this.unsupported('listing roles');
  }

  async getRolePermissions(_roleName: string): Promise<RolePermissions> {
    return this.unsupported('loading role permissions');
  }

  async grantPermission(_params: {
    roleName: string;
    objectType: ObjectType;
    schemaName: string;
    objectName: string;
    privileges: PrivilegeType[];
  }): Promise<GrantRevokeResponse> {
    return this.unsupported('granting permissions');
  }

  async revokePermission(_params: {
    roleName: string;
    objectType: ObjectType;
    schemaName: string;
    objectName: string;
    privileges: PrivilegeType[];
  }): Promise<GrantRevokeResponse> {
    return this.unsupported('revoking permissions');
  }

  async getDatabasePermissions(
    _roleName: string
  ): Promise<DatabasePermission[]> {
    return this.unsupported('loading database permissions');
  }

  async getRoleInheritance(_roleName: string): Promise<RoleInheritanceNode[]> {
    return this.unsupported('loading role inheritance');
  }

  async getDatabases(): Promise<DatabaseInfo[]> {
    return this.unsupported('listing databases');
  }

  async createRole(
    _params: Omit<CreateRoleRequest, 'dbConnectionString'>
  ): Promise<GrantRevokeResponse> {
    return this.unsupported('creating roles');
  }

  async deleteRole(_roleName: string): Promise<GrantRevokeResponse> {
    return this.unsupported('deleting roles');
  }

  async getSchemas(): Promise<SchemaInfo[]> {
    return this.unsupported('listing schemas');
  }

  async getSchemaObjects(_schemaName: string): Promise<SchemaObjects> {
    return this.unsupported('listing schema objects');
  }

  async grantBulkPermissions(
    _params: Omit<BulkGrantRequest, 'dbConnectionString'>
  ): Promise<BulkGrantResponse> {
    return this.unsupported('granting bulk permissions');
  }
}
