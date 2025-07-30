import type { Node } from '@vue-flow/core';
import type { TableMetadata } from '~/server/api/get-tables';

export interface Position {
  x: number;
  y: number;
}

export type TableNode = Node<TableMetadata>;
