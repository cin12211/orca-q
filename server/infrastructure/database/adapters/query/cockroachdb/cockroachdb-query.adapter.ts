import { DatabaseClientType } from '~/core/constants/database-client-type';
import { PostgresQueryAdapter } from '../postgres/postgres-query.adapter';
import type { DatabaseQueryAdapterParams } from '../types';

/** CockroachDB runs queries over the pg driver, so Postgres execution applies. */
export class CockroachQueryAdapter extends PostgresQueryAdapter {
  override readonly dbType: DatabaseClientType = DatabaseClientType.COCKROACHDB;

  static override async create(
    params: DatabaseQueryAdapterParams
  ): Promise<CockroachQueryAdapter> {
    const adapter = await CockroachQueryAdapter.resolveAdapter(
      params,
      DatabaseClientType.COCKROACHDB
    );
    return new CockroachQueryAdapter(adapter);
  }
}
