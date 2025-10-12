import type { TableMetadata } from '~/server/api/get-tables';
import { DEFAULT_VUE_FLOW_LAYOUT_CONFIG } from '../constants';
import type { NodePosition } from '../type';
import {
  buildTableNodeId,
  calcTableHeight,
  createEdges,
  createNodes,
} from './buildERDWithPrimaryTables';

const { HORIZONTAL_STEP, VERTICAL_STEP } = DEFAULT_VUE_FLOW_LAYOUT_CONFIG;

/**
 * 🚀 Generate simple grid layout to display all tables nicely on screen
 */
function generateGridLayout(
  tablesData: TableMetadata[]
): Record<string, NodePosition> {
  const positions: Record<string, NodePosition> = {};
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
      const height = calcTableHeight(table.columns.length);

      const tableId = buildTableNodeId({
        schemaName: table.schema,
        tableName: table.table,
      });

      positions[tableId] = {
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

/**
 * 🧭 Dịch chuyển toàn bộ layout để tâm layout nằm ở (0, 0)
 */
function centerLayoutAtOrigin(positions: Record<string, NodePosition>) {
  const xs = Object.values(positions).map(p => p.x);
  const ys = Object.values(positions).map(p => p.y);
  if (xs.length === 0 || ys.length === 0) return positions;

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const centered: Record<string, NodePosition> = {};
  for (const [id, pos] of Object.entries(positions)) {
    centered[id] = {
      x: pos.x - centerX,
      y: pos.y - centerY,
    };
  }

  return centered;
}

/** 🚀 Build ERD đơn giản dạng spiral layout */
export const oldBuildFullERD = (tablesData: TableMetadata[]) => {
  let matrix = generateGridLayout(tablesData);
  matrix = centerLayoutAtOrigin(matrix);

  const nodes = createNodes(tablesData, matrix);
  const edges = createEdges(tablesData);
  return { nodes, edges };
};
