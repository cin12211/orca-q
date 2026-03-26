import type {
  DatabaseRole,
  DatabasePermission,
  DatabaseInfo,
  RoleInheritanceNode,
  SchemaInfo,
  SchemaObjects,
} from '~/core/types';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';

export class PostgresRoleQueryAdapter {
  constructor(private readonly adapter: IDatabaseAdapter) {}

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
        r.rolname = ?
      ORDER BY
        r.rolcanlogin DESC,
        r.rolsuper DESC,
        r.rolname ASC
      ;
    `;

    const result = await this.adapter.rawQuery(query, [roleName]);

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
      ORDER BY
        r.rolcanlogin DESC,
        r.rolsuper DESC,
        r.rolname ASC
      ;
    `;

    const result = await this.adapter.rawQuery(query);

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

  async getDatabasePermissions(
    roleName: string
  ): Promise<DatabasePermission[]> {
    const query = `
      SELECT
        d.datname AS database_name,
        d.oid AS database_oid,
        has_database_privilege(?, d.datname, 'CONNECT') AS can_connect,
        has_database_privilege(?, d.datname, 'CREATE') AS can_create,
        has_database_privilege(?, d.datname, 'TEMPORARY') AS can_temp
      FROM pg_database d
      WHERE d.datistemplate = false
        AND d.datallowconn = true
      ORDER BY d.datname;
    `;

    const result = await this.adapter.rawQuery(query, [
      roleName,
      roleName,
      roleName,
    ]);

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

  async getRoleInheritance(roleName: string): Promise<RoleInheritanceNode[]> {
    const query = `
      WITH RECURSIVE role_tree AS (
        SELECT r.oid, r.rolname, 0 AS depth
        FROM pg_roles r
        WHERE r.rolname = ?
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

    const result = await this.adapter.rawQuery(query, [roleName]);

    return result.map((row: { rolname: string; depth: number }) => ({
      roleName: row.rolname,
      depth: Number(row.depth) || 0,
    }));
  }

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

    const result = await this.adapter.rawQuery(query);

    return result.map(
      (row: { database_name: string; database_oid: number }) => ({
        databaseName: row.database_name,
        databaseOid: row.database_oid,
      })
    );
  }

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

    const result = await this.adapter.rawQuery(query);

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

  async getSchemaObjects(schemaName: string): Promise<SchemaObjects> {
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = ? AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const viewsQuery = `
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = ?
      ORDER BY table_name;
    `;

    const functionsQuery = `
      SELECT
        p.proname AS name,
        pg_get_function_identity_arguments(p.oid) AS signature
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = ?
      ORDER BY p.proname;
    `;

    const sequencesQuery = `
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = ?
      ORDER BY sequence_name;
    `;

    const [tables, views, functions, sequences] = await Promise.all([
      this.adapter.rawQuery(tablesQuery, [schemaName]),
      this.adapter.rawQuery(viewsQuery, [schemaName]),
      this.adapter.rawQuery(functionsQuery, [schemaName]),
      this.adapter.rawQuery(sequencesQuery, [schemaName]),
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
}
