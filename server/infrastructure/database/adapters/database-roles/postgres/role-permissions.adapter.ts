import type {
  ObjectPermission,
  RolePermissions,
  GrantRevokeResponse,
  ObjectType,
  PrivilegeType,
  BulkGrantRequest,
  BulkGrantResponse,
  BulkGrantResult,
} from '~/core/types';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';

export class PostgresRolePermissionsAdapter {
  constructor(private readonly adapter: IDatabaseAdapter) {}

  async getRolePermissions(roleName: string): Promise<RolePermissions> {
    const tablePermissionsQuery = `
    SELECT
      r.rolname        AS grantee,
      t.schemaname     AS schema_name,
      t.tablename      AS object_name,
      COALESCE(
        JSONB_AGG(
          DISTINCT g.privilege_type
          ORDER BY g.privilege_type
        ) FILTER (WHERE g.privilege_type IS NOT NULL),
        '[]'::jsonb
      )                AS privileges,
      BOOL_OR(g.is_grantable = 'YES') AS is_grantable
    FROM
      pg_tables t
    CROSS JOIN
      pg_roles r
    LEFT JOIN
      information_schema.role_table_grants g
        ON g.table_schema = t.schemaname
       AND g.table_name   = t.tablename
       AND g.grantee      = r.rolname
    WHERE
      r.rolname = ?
      AND t.schemaname NOT IN ('pg_catalog', 'information_schema')
    GROUP BY
      r.rolname,
      t.schemaname,
      t.tablename
    ORDER BY
      t.schemaname,
      t.tablename;
  `;

    const viewPermissionsQuery = `
    WITH view_like AS (
      SELECT schemaname, viewname AS object_name
      FROM pg_views
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      UNION ALL
      SELECT schemaname, matviewname AS object_name
      FROM pg_matviews
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
    )
    SELECT
      r.rolname        AS grantee,
      v.schemaname     AS schema_name,
      v.object_name    AS object_name,
      COALESCE(
        JSONB_AGG(
          DISTINCT g.privilege_type
          ORDER BY g.privilege_type
        ) FILTER (WHERE g.privilege_type IS NOT NULL),
        '[]'::jsonb
      )                AS privileges,
      BOOL_OR(g.is_grantable = 'YES') AS is_grantable
    FROM
      view_like v
    CROSS JOIN
      pg_roles r
    LEFT JOIN
      information_schema.role_table_grants g
        ON g.table_schema = v.schemaname
       AND g.table_name   = v.object_name
       AND g.grantee      = r.rolname
    WHERE
      r.rolname = ?
    GROUP BY
      r.rolname,
      v.schemaname,
      v.object_name
    ORDER BY
      v.schemaname,
      v.object_name;
  `;

    const schemaPermissionsQuery = `
    SELECT
      n.nspname AS schema_name,
      has_schema_privilege(?, n.nspname, 'USAGE')  AS has_usage,
      has_schema_privilege(?, n.nspname, 'CREATE') AS has_create
    FROM
      pg_namespace n
    WHERE
      n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      AND n.nspname NOT LIKE 'pg_temp_%'
      AND n.nspname NOT LIKE 'pg_toast_temp_%'
    ORDER BY
      n.nspname;
  `;

    const functionPermissionsQuery = `
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS arguments,
      has_function_privilege(?, p.oid, 'EXECUTE') AS has_execute
    FROM
      pg_proc p
    JOIN
      pg_namespace n ON n.oid = p.pronamespace
    WHERE
      n.nspname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY
      n.nspname,
      p.proname;
  `;

    const [tableResults, viewResults, schemaResults, functionResults] =
      await Promise.all([
        this.adapter.rawQuery(tablePermissionsQuery, [roleName]),
        this.adapter.rawQuery(viewPermissionsQuery, [roleName]),
        this.adapter.rawQuery(schemaPermissionsQuery, [roleName, roleName]),
        this.adapter.rawQuery(functionPermissionsQuery, [roleName]),
      ]);

    const tablePermissions: ObjectPermission[] = tableResults.map(
      (row: any) => ({
        objectType: 'table',
        schemaName: row.schema_name,
        objectName: row.object_name,
        privileges: row.privileges,
        grantedBy: '',
        isGrantable: row.is_grantable,
      })
    );

    const viewPermissions: ObjectPermission[] = viewResults.map((row: any) => ({
      objectType: 'view',
      schemaName: row.schema_name,
      objectName: row.object_name,
      privileges: row.privileges,
      grantedBy: '',
      isGrantable: row.is_grantable,
    }));

    const schemaPermissions: ObjectPermission[] = schemaResults.map(
      (row: any) => {
        const privileges: PrivilegeType[] = [];
        if (row.has_usage) privileges.push('USAGE');
        if (row.has_create) privileges.push('CREATE');

        return {
          objectType: 'schema',
          schemaName: row.schema_name,
          objectName: row.schema_name,
          privileges,
          grantedBy: '',
          isGrantable: false,
        };
      }
    );

    const functionPermissions: ObjectPermission[] = functionResults.map(
      (row: any) => ({
        objectType: 'function',
        schemaName: row.schema_name,
        objectName: `${row.function_name}(${row.arguments})`,
        privileges: row.has_execute ? ['EXECUTE'] : [],
        grantedBy: '',
        isGrantable: false,
      })
    );

    return {
      roleName,
      tablePermissions,
      viewPermissions,
      schemaPermissions,
      functionPermissions,
    };
  }

  async grantPermission(params: {
    roleName: string;
    objectType: ObjectType;
    schemaName: string;
    objectName: string;
    privileges: PrivilegeType[];
  }): Promise<GrantRevokeResponse> {
    const privileges = params.privileges.join(', ');
    const objectReference = this.buildObjectReference(
      params.objectType,
      params.schemaName,
      params.objectName
    );

    const sql = `GRANT ${privileges} ON ${objectReference} TO "${params.roleName}"`;

    try {
      await this.adapter.rawQuery(sql);

      return {
        success: true,
        message: `Successfully granted ${privileges} on ${params.objectType} ${params.schemaName}.${params.objectName} to ${params.roleName}`,
        sql,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      throw createError({
        statusCode: 500,
        statusMessage: `Failed to grant permission: ${errorMessage}`,
        data: { sql },
      });
    }
  }

  async revokePermission(params: {
    roleName: string;
    objectType: ObjectType;
    schemaName: string;
    objectName: string;
    privileges: PrivilegeType[];
  }): Promise<GrantRevokeResponse> {
    const privileges = params.privileges.join(', ');
    const objectReference = this.buildObjectReference(
      params.objectType,
      params.schemaName,
      params.objectName
    );

    const sql = `REVOKE ${privileges} ON ${objectReference} FROM "${params.roleName}"`;

    try {
      await this.adapter.rawQuery(sql);

      return {
        success: true,
        message: `Successfully revoked ${privileges} on ${params.objectType} ${params.schemaName}.${params.objectName} from ${params.roleName}`,
        sql,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      throw createError({
        statusCode: 500,
        statusMessage: `Failed to revoke permission: ${errorMessage}`,
        data: { sql },
      });
    }
  }

  async grantBulkPermissions(
    params: Omit<BulkGrantRequest, 'dbConnectionString'>
  ): Promise<BulkGrantResponse> {
    const results: BulkGrantResult[] = [];

    for (const dbGrant of params.databaseGrants) {
      if (dbGrant.privileges.length === 0) continue;
      const privileges = dbGrant.privileges.join(', ');
      const sql = `GRANT ${privileges} ON DATABASE "${dbGrant.databaseName}" TO "${params.roleName}"`;
      try {
        await this.adapter.rawQuery(sql);
        results.push({ success: true, sql });
      } catch (error) {
        results.push({
          success: false,
          sql,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    for (const schemaGrant of params.schemaGrants) {
      if (schemaGrant.privileges.length === 0) continue;
      const privileges = schemaGrant.privileges.join(', ');
      const sql = `GRANT ${privileges} ON SCHEMA "${schemaGrant.schemaName}" TO "${params.roleName}"`;
      try {
        await this.adapter.rawQuery(sql);
        results.push({ success: true, sql });
      } catch (error) {
        results.push({
          success: false,
          sql,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    for (const objGrant of params.objectGrants) {
      if (objGrant.privileges.length === 0) continue;
      const privileges = objGrant.privileges.join(', ');

      let objectRef: string;
      if (objGrant.objectName) {
        objectRef = this.buildObjectReference(
          objGrant.objectType,
          objGrant.schemaName,
          objGrant.objectName
        );
      } else {
        const typeWord = this.getObjectTypeWord(objGrant.objectType);
        objectRef = `ALL ${typeWord} IN SCHEMA "${objGrant.schemaName}"`;
      }

      const sql = `GRANT ${privileges} ON ${objectRef} TO "${params.roleName}"`;
      try {
        await this.adapter.rawQuery(sql);
        results.push({ success: true, sql });
      } catch (error) {
        results.push({
          success: false,
          sql,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      if (objGrant.applyToFuture && !objGrant.objectName) {
        const typeWord = this.getObjectTypeWord(objGrant.objectType);
        const defaultSql = `ALTER DEFAULT PRIVILEGES IN SCHEMA "${objGrant.schemaName}" GRANT ${privileges} ON ${typeWord} TO "${params.roleName}"`;
        try {
          await this.adapter.rawQuery(defaultSql);
          results.push({ success: true, sql: defaultSql });
        } catch (error) {
          results.push({
            success: false,
            sql: defaultSql,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      success: failed === 0,
      results,
      totalSucceeded: succeeded,
      totalFailed: failed,
    };
  }

  private buildObjectReference(
    objectType: ObjectType,
    schemaName: string,
    objectName: string
  ): string {
    switch (objectType) {
      case 'table':
        return `TABLE "${schemaName}"."${objectName}"`;
      case 'schema':
        return `SCHEMA "${objectName}"`;
      case 'function':
        return `FUNCTION "${schemaName}".${objectName}`;
      case 'sequence':
        return `SEQUENCE "${schemaName}"."${objectName}"`;
      default:
        throw createError({
          statusCode: 400,
          statusMessage: `Invalid object type: ${objectType}`,
        });
    }
  }

  private getObjectTypeWord(objectType: ObjectType): string {
    switch (objectType) {
      case 'table':
        return 'TABLES';
      case 'function':
        return 'FUNCTIONS';
      case 'sequence':
        return 'SEQUENCES';
      case 'schema':
        return 'SCHEMAS';
      default:
        return 'TABLES';
    }
  }
}
