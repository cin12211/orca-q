/**
 * PostgreSQL Role Adapter
 * Implements database role management for PostgreSQL
 */
import type { DataSource } from 'typeorm';
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
  BulkGrantResult,
} from '~/core/types';
import type { IDatabaseRoleAdapter, DatabaseRoleAdapterParams } from './types';

export class PostgresRoleAdapter implements IDatabaseRoleAdapter {
  readonly dbType = 'postgres';
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  /**
   * Create a PostgreSQL adapter from connection string
   */
  static async create(
    params: DatabaseRoleAdapterParams
  ): Promise<PostgresRoleAdapter> {
    const dataSource = await getDatabaseSource({
      dbConnectionString: params.dbConnectionString,
      type: 'postgres',
    });
    return new PostgresRoleAdapter(dataSource);
  }

  async getRole(roleName: string): Promise<DatabaseRole> {
    const query = `
      SELECT
        r.rolname AS role_name,
        r.oid AS role_oid,
        r.rolsuper AS is_superuser,
        r.rolcanlogin AS can_login,
        r.rolcreatedb AS can_create_db,
        r.rolcreaterole AS can_create_role,
        r.rolreplication AS is_replication,
        r.rolconnlimit AS connection_limit,
        r.rolvaliduntil AS valid_until,
        -- member_of as JSON array (JS-friendly)
        COALESCE(members.member_of, '[]'::jsonb) AS member_of,
        COALESCE(OBJ_DESCRIPTION(r.oid, 'pg_authid'), '') AS comment
      FROM
        pg_roles r
        LEFT JOIN (
          SELECT
            am.member,
            JSONB_AGG(
              pr.rolname
              ORDER BY
                pr.rolname
            ) AS member_of
          FROM
            pg_auth_members am
            JOIN pg_roles pr ON pr.oid = am.roleid
          GROUP BY
            am.member
        ) members ON members.member = r.oid
      WHERE
        r.rolname = $1
      ORDER BY
        r.rolcanlogin DESC,
        r.rolsuper DESC,
        r.rolname ASC
      ;
    `;

    const result = await this.dataSource.query(query, [roleName]);

    return result.map(
      (row: {
        role_name: string;
        role_oid: number;
        is_superuser: boolean;
        can_login: boolean;
        can_create_db: boolean;
        can_create_role: boolean;
        is_replication: boolean;
        connection_limit: number;
        valid_until: string | null;
        member_of: string[];
        comment: string;
      }) => ({
        roleName: row.role_name,
        roleOid: row.role_oid,
        isSuperuser: row.is_superuser,
        canLogin: row.can_login,
        canCreateDb: row.can_create_db,
        canCreateRole: row.can_create_role,
        isReplication: row.is_replication,
        connectionLimit: row.connection_limit,
        validUntil: row.valid_until,
        memberOf: row.member_of || [],
        comment: row.comment || null,
      })
    )[0];
  }

  async getRoles(): Promise<DatabaseRole[]> {
    const query = `
      SELECT
        r.rolname AS role_name,
        r.oid AS role_oid,
        r.rolsuper AS is_superuser,
        r.rolcanlogin AS can_login,
        r.rolcreatedb AS can_create_db,
        r.rolcreaterole AS can_create_role,
        r.rolreplication AS is_replication,
        r.rolconnlimit AS connection_limit,
        r.rolvaliduntil AS valid_until,
        -- member_of as JSON array (JS-friendly)
        COALESCE(members.member_of, '[]'::jsonb) AS member_of,
        COALESCE(OBJ_DESCRIPTION(r.oid, 'pg_authid'), '') AS comment
      FROM
        pg_roles r
        LEFT JOIN (
          SELECT
            am.member,
            JSONB_AGG(
              pr.rolname
              ORDER BY
                pr.rolname
            ) AS member_of
          FROM
            pg_auth_members am
            JOIN pg_roles pr ON pr.oid = am.roleid
          GROUP BY
            am.member
        ) members ON members.member = r.oid
      -- WHERE
      --   r.rolname NOT LIKE 'pg_%'
      ORDER BY
        r.rolcanlogin DESC,
        r.rolsuper DESC,
        r.rolname ASC
      ;
    `;

    const result = await this.dataSource.query(query);

    return result.map(
      (row: {
        role_name: string;
        role_oid: number;
        is_superuser: boolean;
        can_login: boolean;
        can_create_db: boolean;
        can_create_role: boolean;
        is_replication: boolean;
        connection_limit: number;
        valid_until: string | null;
        member_of: string[];
        comment: string;
      }) => ({
        roleName: row.role_name,
        roleOid: row.role_oid,
        isSuperuser: row.is_superuser,
        canLogin: row.can_login,
        canCreateDb: row.can_create_db,
        canCreateRole: row.can_create_role,
        isReplication: row.is_replication,
        connectionLimit: row.connection_limit,
        validUntil: row.valid_until,
        memberOf: row.member_of || [],
        comment: row.comment || null,
      })
    );
  }

  async getRolePermissions(roleName: string): Promise<RolePermissions> {
    /* =====================================================
     * TABLE PERMISSIONS (FULL TABLE LIST)
     * ===================================================== */
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
      r.rolname = $1
      AND t.schemaname NOT IN ('pg_catalog', 'information_schema')
    GROUP BY
      r.rolname,
      t.schemaname,
      t.tablename
    ORDER BY
      t.schemaname,
      t.tablename;
  `;

    /* =====================================================
     * VIEW PERMISSIONS (NEW)
     * ===================================================== */
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
      r.rolname = $1
    GROUP BY
      r.rolname,
      v.schemaname,
      v.object_name
    ORDER BY
      v.schemaname,
      v.object_name;
  `;

    /* =====================================================
     * SCHEMA PERMISSIONS (FULL SCHEMA LIST)
     * ===================================================== */
    const schemaPermissionsQuery = `
    SELECT
      n.nspname AS schema_name,
      has_schema_privilege($1, n.nspname, 'USAGE')  AS has_usage,
      has_schema_privilege($1, n.nspname, 'CREATE') AS has_create
    FROM
      pg_namespace n
    WHERE
      n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      AND n.nspname NOT LIKE 'pg_temp_%'
      AND n.nspname NOT LIKE 'pg_toast_temp_%'
    ORDER BY
      n.nspname;
  `;

    /* =====================================================
     * FUNCTION PERMISSIONS (FULL FUNCTION LIST)
     * ===================================================== */
    const functionPermissionsQuery = `
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS arguments,
      has_function_privilege($1, p.oid, 'EXECUTE') AS has_execute
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
        this.dataSource.query(tablePermissionsQuery, [roleName]),
        this.dataSource.query(viewPermissionsQuery, [roleName]),
        this.dataSource.query(schemaPermissionsQuery, [roleName]),
        this.dataSource.query(functionPermissionsQuery, [roleName]),
      ]);

    /* =====================================================
     * MAP RESULTS
     * ===================================================== */

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
        const privileges: string[] = [];
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
      await this.dataSource.query(sql);

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
      await this.dataSource.query(sql);

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

  /**
   * Build SQL object reference based on object type
   */
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
        // Function name may include arguments
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

  /**
   * Get database-level permissions for a role
   */
  async getDatabasePermissions(
    roleName: string
  ): Promise<DatabasePermission[]> {
    const query = `
      SELECT 
        d.datname AS database_name,
        d.oid AS database_oid,
        has_database_privilege($1, d.datname, 'CONNECT') AS can_connect,
        has_database_privilege($1, d.datname, 'CREATE') AS can_create,
        has_database_privilege($1, d.datname, 'TEMPORARY') AS can_temp
      FROM pg_database d
      WHERE d.datistemplate = false 
        AND d.datallowconn = true
      ORDER BY d.datname;
    `;

    const result = await this.dataSource.query(query, [roleName]);

    return result.map(
      (row: {
        database_name: string;
        database_oid: number;
        can_connect: boolean;
        can_create: boolean;
        can_temp: boolean;
      }) => ({
        databaseName: row.database_name,
        databaseOid: row.database_oid,
        canConnect: row.can_connect,
        canCreate: row.can_create,
        canTemp: row.can_temp,
      })
    );
  }

  /**
   * Get role inheritance tree
   */
  async getRoleInheritance(roleName: string): Promise<RoleInheritanceNode[]> {
    const query = `
      WITH RECURSIVE role_tree AS (
        SELECT r.oid, r.rolname, 0 AS depth
        FROM pg_roles r
        WHERE r.rolname = $1
        UNION ALL
        SELECT p.oid, p.rolname, rt.depth + 1
        FROM pg_auth_members m 
        JOIN pg_roles p ON p.oid = m.roleid
        JOIN role_tree rt ON rt.oid = m.member
      )
      SELECT rolname, depth
      FROM role_tree
      WHERE depth > 0
      ORDER BY depth, rolname;
    `;

    const result = await this.dataSource.query(query, [roleName]);

    return result.map((row: { rolname: string; depth: number }) => ({
      roleName: row.rolname,
      depth: Number(row.depth) || 0,
    }));
  }

  /**
   * Get all databases (no role-specific permissions)
   */
  async getDatabases(): Promise<DatabaseInfo[]> {
    const query = `
      SELECT
        d.datname AS database_name,
        d.oid AS database_oid
      FROM pg_database d
      WHERE d.datistemplate = false
        AND d.datallowconn = true
      ORDER BY d.datname;
    `;

    const result = await this.dataSource.query(query);

    return result.map(
      (row: { database_name: string; database_oid: number }) => ({
        databaseName: row.database_name,
        databaseOid: row.database_oid,
      })
    );
  }

  /**
   * Create a new role/user
   */
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
      await this.dataSource.query(sql);

      // Handle role memberships
      if (params.memberOf && params.memberOf.length > 0) {
        for (const parentRole of params.memberOf) {
          await this.dataSource.query(
            `GRANT "${parentRole}" TO "${params.roleName}"`
          );
        }
      }

      // Add comment if provided
      if (params.comment) {
        await this.dataSource.query(
          `COMMENT ON ROLE "${params.roleName}" IS $1`,
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

  /**
   * Delete a role/user
   */
  async deleteRole(roleName: string): Promise<GrantRevokeResponse> {
    const sql = `DROP ROLE IF EXISTS "${roleName}"`;

    try {
      await this.dataSource.query(sql);

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

  /**
   * Get all schemas in the connected database
   */
  async getSchemas(): Promise<SchemaInfo[]> {
    const query = `
      SELECT 
        nspname AS schema_name,
        has_schema_privilege(current_user, nspname, 'USAGE') AS has_usage,
        has_schema_privilege(current_user, nspname, 'CREATE') AS has_create
      FROM pg_namespace
      WHERE nspname NOT LIKE 'pg_%' 
        AND nspname NOT LIKE 'pg_toast%'
        AND nspname != 'information_schema'
      ORDER BY nspname;
    `;

    const result = await this.dataSource.query(query);

    return result.map(
      (row: {
        schema_name: string;
        has_usage: boolean;
        has_create: boolean;
      }) => ({
        schemaName: row.schema_name,
        hasUsage: row.has_usage,
        hasCreate: row.has_create,
      })
    );
  }

  /**
   * Get objects (tables, views, functions, sequences) in a schema
   */
  async getSchemaObjects(schemaName: string): Promise<SchemaObjects> {
    // Query tables
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1 AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    // Query views
    const viewsQuery = `
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = $1
      ORDER BY table_name;
    `;

    // Query functions
    const functionsQuery = `
      SELECT 
        p.proname AS name,
        pg_get_function_identity_arguments(p.oid) AS signature
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = $1
      ORDER BY p.proname;
    `;

    // Query sequences
    const sequencesQuery = `
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = $1
      ORDER BY sequence_name;
    `;

    const [tables, views, functions, sequences] = await Promise.all([
      this.dataSource.query(tablesQuery, [schemaName]),
      this.dataSource.query(viewsQuery, [schemaName]),
      this.dataSource.query(functionsQuery, [schemaName]),
      this.dataSource.query(sequencesQuery, [schemaName]),
    ]);

    return {
      tables: tables.map((r: { table_name: string }) => r.table_name),
      views: views.map((r: { table_name: string }) => r.table_name),
      functions: functions.map((r: { name: string; signature: string }) => ({
        name: r.name,
        signature: r.signature,
      })),
      sequences: sequences.map(
        (r: { sequence_name: string }) => r.sequence_name
      ),
    };
  }

  /**
   * Bulk grant permissions (for wizard)
   */
  async grantBulkPermissions(
    params: Omit<BulkGrantRequest, 'dbConnectionString'>
  ): Promise<BulkGrantResponse> {
    const results: BulkGrantResult[] = [];

    // 1. Grant database permissions
    for (const dbGrant of params.databaseGrants) {
      if (dbGrant.privileges.length === 0) continue;
      const privileges = dbGrant.privileges.join(', ');
      const sql = `GRANT ${privileges} ON DATABASE "${dbGrant.databaseName}" TO "${params.roleName}"`;
      try {
        await this.dataSource.query(sql);
        results.push({ success: true, sql });
      } catch (error) {
        results.push({
          success: false,
          sql,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // 2. Grant schema permissions
    for (const schemaGrant of params.schemaGrants) {
      if (schemaGrant.privileges.length === 0) continue;
      const privileges = schemaGrant.privileges.join(', ');
      const sql = `GRANT ${privileges} ON SCHEMA "${schemaGrant.schemaName}" TO "${params.roleName}"`;
      try {
        await this.dataSource.query(sql);
        results.push({ success: true, sql });
      } catch (error) {
        results.push({
          success: false,
          sql,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // 3. Grant object permissions
    for (const objGrant of params.objectGrants) {
      if (objGrant.privileges.length === 0) continue;
      const privileges = objGrant.privileges.join(', ');

      // Build object reference
      let objectRef: string;
      if (objGrant.objectName) {
        // Specific object
        objectRef = this.buildObjectReference(
          objGrant.objectType,
          objGrant.schemaName,
          objGrant.objectName
        );
      } else {
        // ALL objects in schema
        const typeWord = this.getObjectTypeWord(objGrant.objectType);
        objectRef = `ALL ${typeWord} IN SCHEMA "${objGrant.schemaName}"`;
      }

      const sql = `GRANT ${privileges} ON ${objectRef} TO "${params.roleName}"`;
      try {
        await this.dataSource.query(sql);
        results.push({ success: true, sql });
      } catch (error) {
        results.push({
          success: false,
          sql,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Apply to future objects if requested
      if (objGrant.applyToFuture && !objGrant.objectName) {
        const typeWord = this.getObjectTypeWord(objGrant.objectType);
        const defaultSql = `ALTER DEFAULT PRIVILEGES IN SCHEMA "${objGrant.schemaName}" GRANT ${privileges} ON ${typeWord} TO "${params.roleName}"`;
        try {
          await this.dataSource.query(defaultSql);
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

  /**
   * Get the plural word for object type (for ALL ... IN SCHEMA syntax)
   */
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
