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
import type { BaseDatabaseAdapterParams } from '../shared';

export type DatabaseTableAdapterParams = BaseDatabaseAdapterParams;

export interface IDatabaseTableAdapter {
  readonly dbType: DatabaseClientType;

  getOverviewTables(schema: string): Promise<TableOverviewMetadata[]>;
  getTableStructure(
    schema: string,
    tableName: string
  ): Promise<TableStructure[]>;
  getTableSize(schema: string, tableName: string): Promise<TableSize>;
  getTableMeta(schema: string, tableName: string): Promise<TableMeta>;
  getTableDdl(schema: string, tableName: string): Promise<string>;

  getTableIndexes(schema: string, tableName: string): Promise<TableIndex[]>;
  getTableRlsStatus(schema: string, tableName: string): Promise<RLSStatus>;
  getTableRlsPolicies(schema: string, tableName: string): Promise<RLSPolicy[]>;
  getTableRules(schema: string, tableName: string): Promise<TableRule[]>;
  getTableTriggers(schema: string, tableName: string): Promise<TableTrigger[]>;

  executeBulkDelete(statements: string[]): Promise<BulkUpdateResponse>;
  executeBulkUpdate(statements: string[]): Promise<BulkUpdateResponse>;
  exportTableData(
    schema: string,
    tableName: string,
    format: string
  ): Promise<any>;
}
