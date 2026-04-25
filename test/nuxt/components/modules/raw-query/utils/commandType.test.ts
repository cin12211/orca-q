import { describe, expect, it } from 'vitest';
import { createCommandResultFactory } from '~/components/modules/raw-query/utils/commandType';
import { DatabaseClientType } from '~/core/constants/database-client-type';

describe('createCommandResultFactory', () => {
  it('uses the MySQL-style handler for MariaDB mutations', () => {
    const result = createCommandResultFactory(
      'TRUNCATE TABLE users',
      0,
      DatabaseClientType.MARIADB
    );

    expect(result.isMutation).toBe(true);
    expect(result.message).toBe('TRUNCATE successful.');
    expect(result.category).toBe('DML');
  });

  it('keeps Oracle merge mutation messages intact', () => {
    const result = createCommandResultFactory(
      'MERGE',
      3,
      DatabaseClientType.ORACLE
    );

    expect(result.isMutation).toBe(true);
    expect(result.message).toBe('MERGE successful. 3 rows affected.');
    expect(result.category).toBe('DML');
  });
});
