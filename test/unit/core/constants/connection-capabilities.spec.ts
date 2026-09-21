import { describe, expect, it } from 'vitest';
import {
  getConnectionCapabilityProfile,
  isSqlFamilyConnection,
} from '~/core/constants/connection-capabilities';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { ActivityBarItemType } from '~/core/types/entities/activity-bar.entity';
import {
  EConnectionFamily,
  EConnectionMethod,
} from '~/core/types/entities/connection.entity';

const { Explorer, Schemas, ErdDiagram, UsersRoles, DatabaseTools, Agent } =
  ActivityBarItemType;

const ALL_SQL_ACTIVITIES = [
  Explorer,
  Schemas,
  ErdDiagram,
  UsersRoles,
  DatabaseTools,
  Agent,
];
const SQL_BASIC_ACTIVITIES = [Explorer, Schemas, ErdDiagram, DatabaseTools];

describe('connection capabilities', () => {
  // Locks the primary sidebar activities shown for every database type.
  it.each([
    [DatabaseClientType.POSTGRES, ALL_SQL_ACTIVITIES],
    [DatabaseClientType.MSSQL, ALL_SQL_ACTIVITIES],
    [DatabaseClientType.SNOWFLAKE, ALL_SQL_ACTIVITIES],
    [DatabaseClientType.MYSQL, SQL_BASIC_ACTIVITIES],
    [DatabaseClientType.MYSQL2, SQL_BASIC_ACTIVITIES],
    [DatabaseClientType.MARIADB, SQL_BASIC_ACTIVITIES],
    [DatabaseClientType.SQLITE3, SQL_BASIC_ACTIVITIES],
    [DatabaseClientType.BETTER_SQLITE3, SQL_BASIC_ACTIVITIES],
    [
      DatabaseClientType.ORACLE,
      [Explorer, Schemas, ErdDiagram, UsersRoles, DatabaseTools],
    ],
    [DatabaseClientType.REDIS, [Explorer, Schemas, DatabaseTools]],
    [DatabaseClientType.MONGODB, [Schemas, DatabaseTools]],
  ])('shows the expected activities for %s', (type, expected) => {
    expect(
      getConnectionCapabilityProfile({ type }).visibleActivityItems
    ).toEqual(expected);
  });

  it('falls back to the PostgreSQL profile without a connection', () => {
    expect(getConnectionCapabilityProfile(undefined)).toBe(
      getConnectionCapabilityProfile({ type: DatabaseClientType.POSTGRES })
    );
    expect(getConnectionCapabilityProfile(null).visibleActivityItems).toEqual(
      ALL_SQL_ACTIVITIES
    );
  });

  it('defaults every type to the Schemas activity', () => {
    for (const type of Object.values(DatabaseClientType)) {
      expect(getConnectionCapabilityProfile({ type }).defaultActivityItem).toBe(
        Schemas
      );
    }
  });

  it('assigns the family of each type', () => {
    expect(
      getConnectionCapabilityProfile({ type: DatabaseClientType.MYSQL }).family
    ).toBe(EConnectionFamily.SQL);
    expect(
      getConnectionCapabilityProfile({ type: DatabaseClientType.REDIS }).family
    ).toBe(EConnectionFamily.REDIS);
    expect(
      getConnectionCapabilityProfile({ type: DatabaseClientType.MONGODB })
        .family
    ).toBe(EConnectionFamily.MONGODB);
  });

  it('keeps query files for SQL and Redis but not MongoDB', () => {
    expect(
      getConnectionCapabilityProfile({ type: DatabaseClientType.REDIS })
        .supportsQueryFiles
    ).toBe(true);
    expect(
      getConnectionCapabilityProfile({ type: DatabaseClientType.POSTGRES })
        .supportsQueryFiles
    ).toBe(true);
    expect(
      getConnectionCapabilityProfile({ type: DatabaseClientType.MONGODB })
        .supportsQueryFiles
    ).toBe(false);
  });

  it('treats only SQL engines as the SQL family', () => {
    expect(
      isSqlFamilyConnection({
        type: DatabaseClientType.MONGODB,
        method: EConnectionMethod.STRING,
      })
    ).toBe(false);
    expect(
      isSqlFamilyConnection({
        type: DatabaseClientType.REDIS,
        method: EConnectionMethod.STRING,
      })
    ).toBe(false);
    expect(
      isSqlFamilyConnection({
        type: DatabaseClientType.SQLITE3,
        method: EConnectionMethod.FILE,
      })
    ).toBe(true);
  });
});
