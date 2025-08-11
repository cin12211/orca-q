import type { Edge, Position } from '@vue-flow/core';
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

export type GetBezierPathParams = {
  sourceX: number;
  sourceY: number;
  sourcePosition?: Position;
  targetX: number;
  targetY: number;
  targetPosition?: Position;
  curvature?: number;
};

export type { Edge };
