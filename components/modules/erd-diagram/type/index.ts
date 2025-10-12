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
}

export type { Edge };

export type TableNode = Node<TableMetadata>;
