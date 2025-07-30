import type { Edge } from '@vue-flow/core';
import type { TableNode } from '~/utils/erd/type';

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
  edges?: Edge[][];
}

export type { Edge };
