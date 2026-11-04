import type { Knex } from 'knex';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { PostgresAdapter } from './postgres.adapter';
import { assertMinimumServerVersion } from './server-version';

/**
 * CockroachDB speaks the Postgres wire protocol, so it reuses the Postgres
 * adapter (pg driver, pg-query-stream, result shapes) through knex's
 * `cockroachdb` client.
 */
export class CockroachAdapter extends PostgresAdapter {
  constructor(connection: string | Knex.Config['connection']) {
    super(connection, 'OrcaQ', DatabaseClientType.COCKROACHDB);
  }

  override async verifyConnection(): Promise<void> {
    await super.verifyConnection();
    await this.assertSupportedServerVersion();
  }

  override async assertSupportedServerVersion(): Promise<void> {
    const [row] = await this.rawQuery<{ version: string }>(
      'SELECT version() AS version'
    );

    assertMinimumServerVersion(
      DatabaseClientType.COCKROACHDB,
      row?.version ?? ''
    );
  }
}
