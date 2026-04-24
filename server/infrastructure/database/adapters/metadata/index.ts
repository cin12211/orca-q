import { DatabaseClientType } from '~/core/constants/database-client-type';

export { createMetadataAdapter } from './metadata.factory';
export {
  METADATA_TYPE_ALIAS_FAMILIES,
  METADATA_TYPE_ALIAS_RULES,
  getMetadataTypeAliasRules,
  normalizeMetadataTypeAliasDatabaseFamily,
  resolveMetadataTypeAlias,
} from './type-alias.constants';

export type {
  IDatabaseMetadataAdapter,
  DatabaseMetadataAdapterParams,
  MetadataTypeAliasDatabaseFamily,
  MetadataTypeAliasMatchKind,
  MetadataTypeAliasRule,
} from './types';
export { PostgresMetadataAdapter } from './postgres/postgres-metadata.adapter';
export { MysqlMetadataAdapter } from './mysql/mysql-metadata.adapter';
export { OracleMetadataAdapter } from './oracle/oracle-metadata.adapter';
export { SqliteMetadataAdapter } from './sqlite/sqlite-metadata.adapter';
