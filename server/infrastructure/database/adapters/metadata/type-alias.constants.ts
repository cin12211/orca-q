import { DatabaseClientType } from '~/core/constants/database-client-type';

export type MetadataTypeAliasDatabaseFamily =
  | DatabaseClientType.POSTGRES
  | DatabaseClientType.MYSQL
  | DatabaseClientType.MARIADB
  | DatabaseClientType.SQLITE3
  | DatabaseClientType.ORACLE;

export type MetadataTypeAliasMatchKind = 'exact' | 'prefix' | 'pattern';

export interface MetadataTypeAliasRule {
  matchKind: MetadataTypeAliasMatchKind;
  rawType: string;
  alias: string;
  preserveModifier?: boolean;
  priority: number;
}

const POSTGRES_TYPE_ALIAS_RULES: MetadataTypeAliasRule[] = [
  {
    matchKind: 'prefix',
    rawType: 'character varying',
    alias: 'varchar',
    preserveModifier: true,
    priority: 10,
  },
  {
    matchKind: 'prefix',
    rawType: 'character',
    alias: 'char',
    preserveModifier: true,
    priority: 20,
  },
  {
    matchKind: 'exact',
    rawType: 'double precision',
    alias: 'float8',
    priority: 30,
  },
  { matchKind: 'exact', rawType: 'real', alias: 'float4', priority: 40 },
  { matchKind: 'exact', rawType: 'integer', alias: 'int4', priority: 50 },
  { matchKind: 'exact', rawType: 'smallint', alias: 'int2', priority: 60 },
  { matchKind: 'exact', rawType: 'bigint', alias: 'int8', priority: 70 },
  { matchKind: 'exact', rawType: 'serial', alias: 'serial4', priority: 75 },
  {
    matchKind: 'exact',
    rawType: 'smallserial',
    alias: 'serial2',
    priority: 76,
  },
  { matchKind: 'exact', rawType: 'bigserial', alias: 'serial8', priority: 77 },
  {
    matchKind: 'prefix',
    rawType: 'bit varying',
    alias: 'varbit',
    preserveModifier: true,
    priority: 80,
  },
  { matchKind: 'exact', rawType: 'boolean', alias: 'bool', priority: 90 },
  {
    matchKind: 'prefix',
    rawType: 'numeric',
    alias: 'decimal',
    preserveModifier: true,
    priority: 100,
  },
  {
    matchKind: 'exact',
    rawType: 'timestamp with time zone',
    alias: 'timestamptz',
    priority: 110,
  },
  {
    matchKind: 'exact',
    rawType: 'timestamp without time zone',
    alias: 'timestamp',
    priority: 120,
  },
  {
    matchKind: 'exact',
    rawType: 'time with time zone',
    alias: 'timetz',
    priority: 130,
  },
];

const MYSQL_FAMILY_TYPE_ALIAS_RULES: MetadataTypeAliasRule[] = [
  { matchKind: 'exact', rawType: 'bool', alias: 'bool', priority: 10 },
  { matchKind: 'exact', rawType: 'boolean', alias: 'bool', priority: 20 },
  { matchKind: 'exact', rawType: 'integer', alias: 'int', priority: 30 },
  { matchKind: 'exact', rawType: 'datetime', alias: 'timestamp', priority: 40 },
  {
    matchKind: 'prefix',
    rawType: 'numeric',
    alias: 'decimal',
    preserveModifier: true,
    priority: 50,
  },
];

const SQLITE_TYPE_ALIAS_RULES: MetadataTypeAliasRule[] = [
  { matchKind: 'exact', rawType: 'integer', alias: 'int', priority: 10 },
  { matchKind: 'exact', rawType: 'boolean', alias: 'bool', priority: 20 },
  { matchKind: 'exact', rawType: 'datetime', alias: 'timestamp', priority: 30 },
  {
    matchKind: 'prefix',
    rawType: 'numeric',
    alias: 'decimal',
    preserveModifier: true,
    priority: 40,
  },
  {
    matchKind: 'prefix',
    rawType: 'character varying',
    alias: 'varchar',
    preserveModifier: true,
    priority: 50,
  },
  {
    matchKind: 'prefix',
    rawType: 'varchar',
    alias: 'varchar',
    preserveModifier: true,
    priority: 60,
  },
  {
    matchKind: 'prefix',
    rawType: 'character',
    alias: 'char',
    preserveModifier: true,
    priority: 70,
  },
];

const ORACLE_TYPE_ALIAS_RULES: MetadataTypeAliasRule[] = [
  {
    matchKind: 'prefix',
    rawType: 'varchar2',
    alias: 'varchar',
    preserveModifier: true,
    priority: 10,
  },
  {
    matchKind: 'prefix',
    rawType: 'nvarchar2',
    alias: 'varchar',
    preserveModifier: true,
    priority: 20,
  },
  {
    matchKind: 'prefix',
    rawType: 'nchar',
    alias: 'char',
    preserveModifier: true,
    priority: 30,
  },
  {
    matchKind: 'prefix',
    rawType: 'char',
    alias: 'char',
    preserveModifier: true,
    priority: 40,
  },
  {
    matchKind: 'prefix',
    rawType: 'number',
    alias: 'decimal',
    preserveModifier: true,
    priority: 50,
  },
  {
    matchKind: 'prefix',
    rawType: 'timestamp with time zone',
    alias: 'timestamptz',
    priority: 60,
  },
  {
    matchKind: 'prefix',
    rawType: 'timestamp with local time zone',
    alias: 'timestamptz',
    priority: 70,
  },
  {
    matchKind: 'prefix',
    rawType: 'timestamp',
    alias: 'timestamp',
    priority: 80,
  },
  { matchKind: 'exact', rawType: 'date', alias: 'date', priority: 90 },
  { matchKind: 'exact', rawType: 'float', alias: 'float', priority: 100 },
];

export const METADATA_TYPE_ALIAS_FAMILIES: MetadataTypeAliasDatabaseFamily[] = [
  DatabaseClientType.POSTGRES,
  DatabaseClientType.MYSQL,
  DatabaseClientType.MARIADB,
  DatabaseClientType.SQLITE3,
  DatabaseClientType.ORACLE,
];

export const METADATA_TYPE_ALIAS_RULES: Record<
  MetadataTypeAliasDatabaseFamily,
  MetadataTypeAliasRule[]
> = {
  [DatabaseClientType.POSTGRES]: POSTGRES_TYPE_ALIAS_RULES,
  [DatabaseClientType.MYSQL]: MYSQL_FAMILY_TYPE_ALIAS_RULES,
  [DatabaseClientType.MARIADB]: MYSQL_FAMILY_TYPE_ALIAS_RULES,
  [DatabaseClientType.SQLITE3]: SQLITE_TYPE_ALIAS_RULES,
  [DatabaseClientType.ORACLE]: ORACLE_TYPE_ALIAS_RULES,
};

const METADATA_TYPE_ALIAS_DATABASE_ALIASES: Partial<
  Record<DatabaseClientType, MetadataTypeAliasDatabaseFamily>
> = {
  [DatabaseClientType.MYSQL2]: DatabaseClientType.MYSQL,
  [DatabaseClientType.BETTER_SQLITE3]: DatabaseClientType.SQLITE3,
};

const normalizeTypeAliasInput = (rawType: string) =>
  rawType.trim().replace(/\s+/g, ' ').toLowerCase();

const getRuleSuffix = (value: string, rule: MetadataTypeAliasRule) => {
  if (rule.matchKind !== 'prefix') {
    return '';
  }

  return value.slice(rule.rawType.length).trimStart();
};

const matchesTypeAliasRule = (
  value: string,
  rule: MetadataTypeAliasRule
): boolean => {
  switch (rule.matchKind) {
    case 'exact':
      return value === rule.rawType;
    case 'prefix':
      return value.startsWith(rule.rawType);
    case 'pattern':
      return new RegExp(rule.rawType).test(value);
  }
};

export const normalizeMetadataTypeAliasDatabaseFamily = (
  dbType: DatabaseClientType
): MetadataTypeAliasDatabaseFamily | null => {
  if (
    METADATA_TYPE_ALIAS_FAMILIES.includes(
      dbType as MetadataTypeAliasDatabaseFamily
    )
  ) {
    return dbType as MetadataTypeAliasDatabaseFamily;
  }

  return METADATA_TYPE_ALIAS_DATABASE_ALIASES[dbType] ?? null;
};

export const getMetadataTypeAliasRules = (
  dbType: DatabaseClientType
): MetadataTypeAliasRule[] => {
  const family = normalizeMetadataTypeAliasDatabaseFamily(dbType);

  if (!family) {
    return [];
  }

  return METADATA_TYPE_ALIAS_RULES[family];
};

export const resolveMetadataTypeAlias = (
  dbType: DatabaseClientType,
  rawType: string
): string => {
  const normalizedType = normalizeTypeAliasInput(rawType);

  if (!normalizedType) {
    return rawType;
  }

  const rule = getMetadataTypeAliasRules(dbType).find(candidate =>
    matchesTypeAliasRule(normalizedType, candidate)
  );

  if (!rule) {
    return rawType.trim();
  }

  if (!rule.preserveModifier) {
    return rule.alias;
  }

  return `${rule.alias}${getRuleSuffix(normalizedType, rule)}`;
};
