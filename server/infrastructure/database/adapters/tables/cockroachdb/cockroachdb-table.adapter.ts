import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  RLSPolicy,
  RLSStatus,
  TableRule,
  TableTrigger,
} from '~/core/types';
import { PostgresTableAdapter } from '../postgres/postgres-table.adapter';
import type { DatabaseTableAdapterParams } from '../types';

export class CockroachTableAdapter extends PostgresTableAdapter {
  override readonly dbType = DatabaseClientType.COCKROACHDB;

  static override async create(
    params: DatabaseTableAdapterParams
  ): Promise<CockroachTableAdapter> {
    const adapter = await CockroachTableAdapter.resolveAdapter(
      params,
      DatabaseClientType.COCKROACHDB
    );
    return new CockroachTableAdapter(adapter);
  }

  override async getTableRlsStatus(
    schema: string,
    tableName: string
  ): Promise<RLSStatus> {
    return { enabled: false };
  }

  override async getTableRlsPolicies(
    schema: string,
    tableName: string
  ): Promise<RLSPolicy[]> {
    return [];
  }

  override async getTableRules(
    schema: string,
    tableName: string
  ): Promise<TableRule[]> {
    return [];
  }

  override async getTableTriggers(
    schema: string,
    tableName: string
  ): Promise<TableTrigger[]> {
    return [];
  }
}
