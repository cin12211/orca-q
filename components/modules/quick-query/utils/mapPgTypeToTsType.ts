import type { DatabaseClientType } from '~/core/constants/database-client-type';
import { getSqlDialect } from '~/core/sql-dialect';

/**
 * Map a database type name to a TypeScript-friendly type string.
 * Defaults to Postgres dialect for backward compatibility.
 *
 * @deprecated Prefer `getSqlDialect(dbType).mapDbTypeToTsType(typeName)` directly.
 */
export function mapPgTypeToTsType(
  udtName: string,
  dbType?: DatabaseClientType | string
): string {
  return getSqlDialect(dbType ?? 'postgres').mapDbTypeToTsType(udtName);
}
