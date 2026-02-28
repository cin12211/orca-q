import type {
  TableOverviewMetadata,
  TableStructure,
  TableSize,
  BulkUpdateResponse,
} from '~/core/types';
import type {
  BaseDatabaseAdapterParams,
  SupportedDatabaseType,
} from '../shared';

export type DatabaseTableAdapterParams = BaseDatabaseAdapterParams;

export interface IDatabaseTableAdapter {
  readonly dbType: SupportedDatabaseType;

  getOverviewTables(schema: string): Promise<TableOverviewMetadata[]>;
  getTableStructure(
    schema: string,
    tableName: string
  ): Promise<TableStructure[]>;
  getTableSize(schema: string, tableName: string): Promise<TableSize>;
  getTableDdl(schema: string, tableName: string): Promise<string>;

  executeBulkDelete(statements: string[]): Promise<BulkUpdateResponse>;
  executeBulkUpdate(statements: string[]): Promise<BulkUpdateResponse>;
  exportTableData(
    schema: string,
    tableName: string,
    format: string
  ): Promise<any>;
}
