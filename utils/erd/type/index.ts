import type { TableMetadata } from '~/server/api/get-tables';

export interface Position {
  x: number;
  y: number;
}

export interface TableNode {
  id: string;
  type: string;
  position: Position;
  data: { value: TableMetadata };
}

export interface Edge {
  id: string;
  type: string;
  source: string;
  target: string;
  sourceHandle: string;
}
