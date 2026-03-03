import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  DatabaseRole,
  ObjectType,
  PrivilegeType,
  RolePermissions,
  GrantRevokeResponse,
  DatabasePermission,
  DatabaseInfo,
  RoleInheritanceNode,
  CreateRoleRequest,
  SchemaInfo,
  SchemaObjects,
  BulkGrantRequest,
  BulkGrantResponse,
} from '~/core/types';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';
import { BaseDomainAdapter } from '../../shared';
import type { IDatabaseRoleAdapter, DatabaseRoleAdapterParams } from '../types';
import { PostgresRoleManagementAdapter } from './role-management.adapter';
import { PostgresRolePermissionsAdapter } from './role-permissions.adapter';
import { PostgresRoleQueryAdapter } from './role-query.adapter';

export class PostgresRoleAdapter
  extends BaseDomainAdapter
  implements IDatabaseRoleAdapter
{
  readonly dbType = DatabaseClientType.POSTGRES;
  private readonly queryAdapter: PostgresRoleQueryAdapter;
  private readonly permissionsAdapter: PostgresRolePermissionsAdapter;
  private readonly managementAdapter: PostgresRoleManagementAdapter;

  constructor(adapter: IDatabaseAdapter) {
    super(adapter);
    this.queryAdapter = new PostgresRoleQueryAdapter(this.adapter);
    this.permissionsAdapter = new PostgresRolePermissionsAdapter(this.adapter);
    this.managementAdapter = new PostgresRoleManagementAdapter(this.adapter);
  }

  static async create(
    params: DatabaseRoleAdapterParams
  ): Promise<PostgresRoleAdapter> {
    const adapter = await PostgresRoleAdapter.resolveAdapter(
      params,
      DatabaseClientType.POSTGRES
    );
    return new PostgresRoleAdapter(adapter);
  }

  async getRole(roleName: string): Promise<DatabaseRole> {
    return this.queryAdapter.getRole(roleName);
  }

  async getRoles(): Promise<DatabaseRole[]> {
    return this.queryAdapter.getRoles();
  }

  async getRolePermissions(roleName: string): Promise<RolePermissions> {
    return this.permissionsAdapter.getRolePermissions(roleName);
  }

  async grantPermission(params: {
    roleName: string;
    objectType: ObjectType;
    schemaName: string;
    objectName: string;
    privileges: PrivilegeType[];
  }): Promise<GrantRevokeResponse> {
    return this.permissionsAdapter.grantPermission(params);
  }

  async revokePermission(params: {
    roleName: string;
    objectType: ObjectType;
    schemaName: string;
    objectName: string;
    privileges: PrivilegeType[];
  }): Promise<GrantRevokeResponse> {
    return this.permissionsAdapter.revokePermission(params);
  }

  async getDatabasePermissions(
    roleName: string
  ): Promise<DatabasePermission[]> {
    return this.queryAdapter.getDatabasePermissions(roleName);
  }

  async getRoleInheritance(roleName: string): Promise<RoleInheritanceNode[]> {
    return this.queryAdapter.getRoleInheritance(roleName);
  }

  async getDatabases(): Promise<DatabaseInfo[]> {
    return this.queryAdapter.getDatabases();
  }

  async createRole(
    params: Omit<CreateRoleRequest, 'dbConnectionString'>
  ): Promise<GrantRevokeResponse> {
    return this.managementAdapter.createRole(params);
  }

  async deleteRole(roleName: string): Promise<GrantRevokeResponse> {
    return this.managementAdapter.deleteRole(roleName);
  }

  async getSchemas(): Promise<SchemaInfo[]> {
    return this.queryAdapter.getSchemas();
  }

  async getSchemaObjects(schemaName: string): Promise<SchemaObjects> {
    return this.queryAdapter.getSchemaObjects(schemaName);
  }

  async grantBulkPermissions(
    params: Omit<BulkGrantRequest, 'dbConnectionString'>
  ): Promise<BulkGrantResponse> {
    return this.permissionsAdapter.grantBulkPermissions(params);
  }
}
