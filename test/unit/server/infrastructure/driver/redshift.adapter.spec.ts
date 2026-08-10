import { describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { RedshiftAdapter } from '~/server/infrastructure/driver/redshift.adapter';

describe('RedshiftAdapter', () => {
  it('configures knex with the redshift client', () => {
    const adapter = new RedshiftAdapter(
      'redshift://admin:secret@cluster.redshift.amazonaws.com:5439/analytics'
    );

    expect(adapter.dbType).toBe(DatabaseClientType.REDSHIFT);
    expect(adapter.knex.client.config.client).toBe('redshift');
  });
});
