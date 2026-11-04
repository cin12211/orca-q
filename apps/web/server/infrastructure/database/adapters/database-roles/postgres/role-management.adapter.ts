import type { CreateRoleRequest, GrantRevokeResponse } from '~/core/types';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';

export class PostgresRoleManagementAdapter {
  constructor(private readonly adapter: IDatabaseAdapter) {}

  async createRole(
    params: Omit<CreateRoleRequest, 'dbConnectionString'>
  ): Promise<GrantRevokeResponse> {
    const options: string[] = [];

    if (params.canLogin) {
      options.push('LOGIN');
      if (params.password) {
        options.push(`PASSWORD '${params.password.replace(/'/g, "''")}'`);
      }
    } else {
      options.push('NOLOGIN');
    }

    if (params.canCreateDb) options.push('CREATEDB');
    if (params.canCreateRole) options.push('CREATEROLE');
    if (params.isReplication) options.push('REPLICATION');
    if (params.connectionLimit !== undefined) {
      options.push(`CONNECTION LIMIT ${params.connectionLimit}`);
    }
    if (params.validUntil) {
      options.push(`VALID UNTIL '${params.validUntil}'`);
    }

    const sql = `CREATE ROLE "${params.roleName}" WITH ${options.join(' ')}`;

    try {
      await this.adapter.rawQuery(sql);

      if (params.memberOf && params.memberOf.length > 0) {
        for (const parentRole of params.memberOf) {
          await this.adapter.rawQuery(
            `GRANT "${parentRole}" TO "${params.roleName}"`
          );
        }
      }

      if (params.comment) {
        await this.adapter.rawQuery(
          `COMMENT ON ROLE "${params.roleName}" IS ?`,
          [params.comment]
        );
      }

      return {
        success: true,
        message: `Successfully created role ${params.roleName}`,
        sql,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      throw createError({
        statusCode: 500,
        statusMessage: `Failed to create role: ${errorMessage}`,
        data: { sql },
      });
    }
  }

  async deleteRole(roleName: string): Promise<GrantRevokeResponse> {
    const sql = `DROP ROLE IF EXISTS "${roleName}"`;

    try {
      await this.adapter.rawQuery(sql);

      return {
        success: true,
        message: `Successfully deleted role ${roleName}`,
        sql,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      throw createError({
        statusCode: 500,
        statusMessage: `Failed to delete role: ${errorMessage}`,
        data: { sql },
      });
    }
  }
}
