import type { Knex } from 'knex';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { PostgresAdapter } from './postgres.adapter';

export class RedshiftAdapter extends PostgresAdapter {
  constructor(
    connection: string | Knex.Config['connection'],
    applicationName: string = 'OrcaQ'
  ) {
    super(connection, applicationName, DatabaseClientType.REDSHIFT);
  }
}
