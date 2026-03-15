import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  TableOverviewMetadata,
  TableStructure,
  TableSize,
  TableMeta,
  BulkUpdateResponse,
  TableIndex,
  RLSPolicy,
  RLSStatus,
  TableRule,
  TableTrigger,
} from '~/core/types';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';
import { BaseDomainAdapter } from '../../shared';
import type {
  IDatabaseTableAdapter,
  DatabaseTableAdapterParams,
} from '../types';
import { PostgresTableAdvancedObjectsAdapter } from './advanced-objects.adapter';
import { PostgresTableExportAdapter } from './export.adapter';
import { PostgresTableMetadataAdapter } from './metadata.adapter';
import { PostgresTableMutationAdapter } from './mutation.adapter';
import { PostgresTableStructureAdapter } from './structure.adapter';

export class PostgresTableAdapter
  extends BaseDomainAdapter
  implements IDatabaseTableAdapter
{
  readonly dbType = DatabaseClientType.POSTGRES;
  private readonly metadataAdapter: PostgresTableMetadataAdapter;
  private readonly structureAdapter: PostgresTableStructureAdapter;
  private readonly mutationAdapter: PostgresTableMutationAdapter;
  private readonly exportAdapter: PostgresTableExportAdapter;
  private readonly advancedObjectsAdapter: PostgresTableAdvancedObjectsAdapter;

  constructor(adapter: IDatabaseAdapter) {
    super(adapter);
    this.metadataAdapter = new PostgresTableMetadataAdapter(this.adapter);
    this.structureAdapter = new PostgresTableStructureAdapter(this.adapter);
    this.mutationAdapter = new PostgresTableMutationAdapter(this.adapter);
    this.exportAdapter = new PostgresTableExportAdapter(this.adapter);
    this.advancedObjectsAdapter = new PostgresTableAdvancedObjectsAdapter(
      this.adapter
    );
  }

  static async create(
    params: DatabaseTableAdapterParams
  ): Promise<PostgresTableAdapter> {
    const adapter = await PostgresTableAdapter.resolveAdapter(
      params,
      DatabaseClientType.POSTGRES
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

  async getTableMeta(schema: string, tableName: string): Promise<TableMeta> {
    return this.metadataAdapter.getTableMeta(schema, tableName);
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

  async getTableIndexes(
    schema: string,
    tableName: string
  ): Promise<TableIndex[]> {
    return this.advancedObjectsAdapter.getTableIndexes(schema, tableName);
  }

  async getTableRlsStatus(
    schema: string,
    tableName: string
  ): Promise<RLSStatus> {
    return this.advancedObjectsAdapter.getTableRlsStatus(schema, tableName);
  }

  async getTableRlsPolicies(
    schema: string,
    tableName: string
  ): Promise<RLSPolicy[]> {
    return this.advancedObjectsAdapter.getTableRlsPolicies(schema, tableName);
  }

  async getTableRules(schema: string, tableName: string): Promise<TableRule[]> {
    return this.advancedObjectsAdapter.getTableRules(schema, tableName);
  }

  async getTableTriggers(
    schema: string,
    tableName: string
  ): Promise<TableTrigger[]> {
    return this.advancedObjectsAdapter.getTableTriggers(schema, tableName);
  }
}
