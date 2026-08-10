import { describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { PostgresAdapter } from '~/server/infrastructure/driver/postgres.adapter';

describe('PostgresAdapter', () => {
  it('defaults to the postgres knex client', () => {
    const adapter = new PostgresAdapter(
      'postgresql://user:pass@localhost:5432/db'
    );

    expect(adapter.dbType).toBe(DatabaseClientType.POSTGRES);
    expect(adapter.knex.client.config.client).toBe('postgres');
  });

  it('accepts an explicit dbType override for the knex client', () => {
    const adapter = new PostgresAdapter(
      'redshift://user:pass@localhost:5439/db',
      'OrcaQ',
      DatabaseClientType.REDSHIFT
    );

    expect(adapter.dbType).toBe(DatabaseClientType.REDSHIFT);
    expect(adapter.knex.client.config.client).toBe('redshift');
  });
});
