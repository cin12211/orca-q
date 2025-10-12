import { type Edge } from '@vue-flow/core';
import { uuidv4 } from '~/lib/utils';
import type { TableMetadata } from '~/server/api/get-tables';
import {
  DEFAULT_VUE_FLOW_LAYOUT_CONFIG,
  HEAD_ROW_HEIGHT,
  ROW_HEIGHT,
} from '../constants';
import type { TableNode } from '../type';
import type { Position } from './buildFullERDDiagram';

const { HORIZONTAL_STEP, VERTICAL_STEP, NODE_TYPE, EDGE_TYPE } =
  DEFAULT_VUE_FLOW_LAYOUT_CONFIG;

const getTableHeight = (table: TableMetadata): number =>
  (table.columns?.length || 0) * ROW_HEIGHT + HEAD_ROW_HEIGHT;

/**
 * 🚀 Generate simple grid layout to display all tables nicely on screen
 */
function generateGridLayout(
  tablesData: TableMetadata[]
): Record<string, Position> {
  const positions: Record<string, Position> = {};
  const n = tablesData.length;
  if (n === 0) return positions;

  // Tính số cột & hàng dựa theo căn bậc 2
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);

  let index = 0;
  let maxRowHeight = 0;
  let currentY = 0;

  for (let row = 0; row < rows; row++) {
    let currentX = 0;
    maxRowHeight = 0;

    for (let col = 0; col < cols && index < n; col++) {
      const table = tablesData[index];
      const height = getTableHeight(table);

      positions[table.table] = {
        x: currentX,
        y: currentY,
      };

      currentX += HORIZONTAL_STEP;
      maxRowHeight = Math.max(maxRowHeight, height + VERTICAL_STEP);
      index++;
    }

    currentY += maxRowHeight;
  }

  return positions;
}

/** Tạo nodes theo grid layout */
const createNodes = (tablesData: TableMetadata[]): TableNode[] => {
  const positions = generateGridLayout(tablesData);
  return tablesData.map(table => ({
    id: table.table,
    type: NODE_TYPE,
    position: positions[table.table],
    data: table,
  }));
};

/** Tạo edges cho foreign keys */
const createEdges = (tablesData: TableMetadata[]): Edge[] => {
  const edges: Edge[] = [];
  for (const table of tablesData) {
    for (const fk of table.foreign_keys) {
      edges.push({
        id: uuidv4(),
        type: EDGE_TYPE,
        source: table.table,
        target: fk.reference_table,
        sourceHandle: fk.column,
      });
    }
  }
  return edges;
};

/** 🚀 Build ERD đơn giản dạng spiral layout */
export const oldBuildFullERD = (tablesData: TableMetadata[]) => {
  const nodes = createNodes(tablesData);
  const edges = createEdges(tablesData);
  return { nodes, edges };
};
