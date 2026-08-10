import { describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { CockroachAdapter } from '~/server/infrastructure/driver/cockroachdb.adapter';

describe('CockroachAdapter', () => {
  it('configures knex with the cockroachdb client', () => {
    const adapter = new CockroachAdapter(
      'cockroachdb://root:secret@localhost:26257/defaultdb'
    );

    expect(adapter.dbType).toBe(DatabaseClientType.COCKROACHDB);
    expect(adapter.knex.client.config.client).toBe('cockroachdb');
  });
});
