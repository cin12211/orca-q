import type { TableNode, Edge } from '~/utils/erd/type/index';

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
