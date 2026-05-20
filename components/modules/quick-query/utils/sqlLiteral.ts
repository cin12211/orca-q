import { DatabaseClientType } from '~/core/constants/database-client-type';
import { getSqlDialect } from '~/core/sql-dialect';

export {
  isSqlRowMetadataColumn,
  getSqlDataColumnNames,
} from '~/core/helpers/sql-metadata';

export function toSqlLiteral(
  value: unknown,
  options: { dbType?: DatabaseClientType | string } = {}
): string {
  return getSqlDialect(options.dbType).toLiteral(value);
}
