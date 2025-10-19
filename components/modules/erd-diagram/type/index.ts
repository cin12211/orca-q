import type { BackgroundVariantType } from '@vue-flow/background';
import type { Edge, Node } from '@vue-flow/core';
import type { TableMetadata } from '~/server/api/get-tables';

export interface DBSchemaProps {
  id: string;
  table: string;
  columns: Array<{
    name: string;
    type: string;
  }>;
  primary_keys: Array<{
    column: string;
  }>;
  foreign_keys: Array<{
    column: string;
  }>;
}

export interface ErdDiagramProps {
  nodes?: TableNode[];
  edges?: Edge[];
  focusTableId?: string;
  isShowFilter: boolean;
  matrixTablePosition?: MatrixTablePosition;
  tables: TableMetadata[];
  tableId?: string;
}

export type { Edge };

export type TableNode = Node<TableMetadata>;

export type NodePosition = Node['position'];

export type LabelTableNode = Map<string, boolean>;

export type ActiveEdge = {
  edgeId: string;
  sourceId: string;
  targetId: string;
};

export type ActiveTable = {
  tableId: string;
  edgeIds: Set<string>;
  relatedColumnIds: Set<string>;
};

export type MatrixTablePosition = Record<string, NodePosition>;

export type BackGroundGridStatus = BackgroundVariantType | false;
