import type { FieldDef } from 'pg';
import type { RowData } from '~/components/base/dynamic-table/utils';
import type { Connection } from '~/core/stores';
import type { DatabaseDriverError } from '~/core/types';

export interface MappedRawColumn {
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  queryFieldName: string; // use this for display field name
  originalName: string; // use this for update statement or delete statement
  aliasFieldName: string; // use this for display field name
  canMutate?: boolean;
  ordinal_position?: number | undefined;
  type?: string | undefined;
  short_type_name?: string | undefined;
  tableName: string;
}

export interface EditorCursor {
  line: number;
  column: number;
}

export type ExplainAnalyzeOptionKey =
  | 'BUFFERS'
  | 'COSTS'
  | 'GENERIC_PLAN'
  | 'MEMORY'
  | 'SERIALIZE'
  | 'SETTINGS'
  | 'SUMMARY'
  | 'TIMING'
  | 'VERBOSE'
  | 'WAL';

export type ExplainAnalyzeToggleOptionKey = Exclude<
  ExplainAnalyzeOptionKey,
  'SERIALIZE'
>;

export type ExplainAnalyzeSerializeMode = 'NONE' | 'TEXT' | 'BINARY';

export interface ExplainAnalyzeOptionItem {
  key: ExplainAnalyzeToggleOptionKey;
  label: string;
  checked: boolean;
}

export interface ExecutedResultItem {
  id: string;
  metadata: {
    queryTime: number;
    statementQuery: string;
    executedAt: Date;
    executeErrors:
      | {
          message: string;
          data: Partial<DatabaseDriverError>;
        }
      | undefined;
    fieldDefs?: FieldDef[];
    connection?: Connection | undefined;
    command?: string;
    rowCount?: number;
  };
  result: RowData[];
  seqIndex: number;
  view: 'result' | 'error' | 'info' | 'raw' | 'agent' | 'explain';
}
