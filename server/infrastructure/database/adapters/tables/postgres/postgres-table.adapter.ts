import type {
  TableOverviewMetadata,
  TableStructure,
  TableSize,
  BulkUpdateResponse,
} from '~/core/types';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';
import { BaseDomainAdapter, SupportedDatabaseType } from '../../shared';
import type {
  IDatabaseTableAdapter,
  DatabaseTableAdapterParams,
} from '../types';
import { PostgresTableExportAdapter } from './export.adapter';
import { PostgresTableMetadataAdapter } from './metadata.adapter';
import { PostgresTableMutationAdapter } from './mutation.adapter';
import { PostgresTableStructureAdapter } from './structure.adapter';

export class PostgresTableAdapter
  extends BaseDomainAdapter
  implements IDatabaseTableAdapter
{
  readonly dbType = SupportedDatabaseType.POSTGRES;
  private readonly metadataAdapter: PostgresTableMetadataAdapter;
  private readonly structureAdapter: PostgresTableStructureAdapter;
  private readonly mutationAdapter: PostgresTableMutationAdapter;
  private readonly exportAdapter: PostgresTableExportAdapter;

  constructor(adapter: IDatabaseAdapter) {
    super(adapter);
    this.metadataAdapter = new PostgresTableMetadataAdapter(this.adapter);
    this.structureAdapter = new PostgresTableStructureAdapter(this.adapter);
    this.mutationAdapter = new PostgresTableMutationAdapter(this.adapter);
    this.exportAdapter = new PostgresTableExportAdapter(this.adapter);
  }

  static async create(
    params: DatabaseTableAdapterParams
  ): Promise<PostgresTableAdapter> {
    const adapter = await PostgresTableAdapter.resolveAdapter(
      params,
      SupportedDatabaseType.POSTGRES
    );
    return new PostgresTableAdapter(adapter);
  }

  async getOverviewTables(schema: string): Promise<TableOverviewMetadata[]> {
    return this.metadataAdapter.getOverviewTables(schema);
  }

  async getTableStructure(
    schema: string,
    tableName: string
  ): Promise<TableStructure[]> {
    return this.structureAdapter.getTableStructure(schema, tableName);
  }

  async getTableSize(schema: string, tableName: string): Promise<TableSize> {
    return this.structureAdapter.getTableSize(schema, tableName);
  }

  async getTableDdl(schema: string, tableName: string): Promise<string> {
    return this.structureAdapter.getTableDdl(schema, tableName);
  }

  async executeBulkDelete(statements: string[]): Promise<BulkUpdateResponse> {
    return this.mutationAdapter.executeBulkDelete(statements);
  }

  async executeBulkUpdate(statements: string[]): Promise<BulkUpdateResponse> {
    return this.mutationAdapter.executeBulkUpdate(statements);
  }

  async exportTableData(
    schema: string,
    tableName: string,
    format: string
  ): Promise<any> {
    return this.exportAdapter.exportTableData(schema, tableName, format);
  }
}
