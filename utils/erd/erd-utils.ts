import { MarkerType, type Edge } from '@vue-flow/core';
import { uuidv4 } from '~/lib/utils';
import type { TableMetadata } from '~/server/api/get-tables';
import type { Position, TableNode } from '~/utils/erd/type/index';

const LAYOUT_CONFIG = {
  BASE_X: 600,
  BASE_Y: 200,
  HORIZONTAL_STEP: 484, // 384 + 100 (width + spacing)
  VERTICAL_STEP: 900, // 800 + 100 (height + spacing)
  NODE_TYPE: 'value',
  EDGE_TYPE: 'custom',
} as const;

function generateGridPositions(nodeCount: number): Position[] {
  const positions: Position[] = [
    {
      x: LAYOUT_CONFIG.BASE_X,
      y: LAYOUT_CONFIG.BASE_Y,
    },
  ];

  for (let radius = 1; positions.length < nodeCount; radius++) {
    // Top
    for (let i = -radius; i <= radius && positions.length < nodeCount; i++) {
      positions.push({
        x: i * LAYOUT_CONFIG.HORIZONTAL_STEP + LAYOUT_CONFIG.BASE_X,
        y: -radius * LAYOUT_CONFIG.VERTICAL_STEP + LAYOUT_CONFIG.BASE_Y,
      });
    }

    // Right
    for (
      let j = -radius + 1;
      j <= radius && positions.length < nodeCount;
      j++
    ) {
      positions.push({
        x: radius * LAYOUT_CONFIG.HORIZONTAL_STEP + LAYOUT_CONFIG.BASE_X,
        y: j * LAYOUT_CONFIG.VERTICAL_STEP + LAYOUT_CONFIG.BASE_Y,
      });
    }

    // Bottom
    for (
      let i = radius - 1;
      i >= -radius && positions.length < nodeCount;
      i--
    ) {
      positions.push({
        x: i * LAYOUT_CONFIG.HORIZONTAL_STEP + LAYOUT_CONFIG.BASE_X,
        y: radius * LAYOUT_CONFIG.VERTICAL_STEP + LAYOUT_CONFIG.BASE_Y,
      });
    }

    // Left
    for (
      let j = radius - 1;
      j >= -radius + 1 && positions.length < nodeCount;
      j--
    ) {
      positions.push({
        x: -radius * LAYOUT_CONFIG.HORIZONTAL_STEP + LAYOUT_CONFIG.BASE_X,
        y: j * LAYOUT_CONFIG.VERTICAL_STEP + LAYOUT_CONFIG.BASE_Y,
      });
    }
  }

  return positions;
}

export const createNodes = (tablesData: TableMetadata[]): TableNode[] => {
  const positions = generateGridPositions(tablesData.length);

  return tablesData.map((table, index) => {
    const node: TableNode = {
      id: table.table,
      type: LAYOUT_CONFIG.NODE_TYPE,
      position: positions[index],
      data: table,
    };
    return node;
  });
};

export const createEdges = (tablesData: TableMetadata[]): Edge[][] => {
  console.log('tablesData-----------------\n:', tablesData);
  return tablesData.map(table =>
    table.foreign_keys.map(foreignKey => {
      const edge: Edge = {
        id: uuidv4(),
        type: LAYOUT_CONFIG.EDGE_TYPE,
        source: table.table,
        target: foreignKey.reference_table,
        sourceHandle: foreignKey.column,
        // markerEnd: MarkerType.ArrowClosed,
        // markerStart: MarkerType.Arrow,
      };
      return edge;
    })
  );
};

export const filterTable = (
  tableNames: string[],
  tablesData: TableMetadata[]
) => {
  const tableNameSet = new Set(tableNames);
  // this only get table usage with selected fk field
  const includesUsageTables: TableMetadata[] = [];
  const relatedTableNames = new Set(tableNames);

  // Single pass to find usage tables and related tables
  for (const table of tablesData) {
    const isInTableNames = tableNameSet.has(table.table);

    if (isInTableNames) {
      // Add all referenced tables from selected tables
      for (const fk of table.foreign_keys) {
        relatedTableNames.add(fk.reference_table);
      }
    } else {
      // Check if this table references any selected table
      for (const fk of table.foreign_keys) {
        if (tableNameSet.has(fk.reference_table)) {
          includesUsageTables.push(table);
          break;
        }
      }
    }
  }

  // Filter tables based on related table names
  const filteredTables: TableMetadata[] = [];
  for (const table of tablesData) {
    if (relatedTableNames.has(table.table)) {
      filteredTables.push(table);
    }
  }

  // Merge tables
  const tables = filteredTables.concat(includesUsageTables);

  return {
    filteredEdges: createEdges(tables),
    filteredNodes: createNodes(tables),
  };
};
