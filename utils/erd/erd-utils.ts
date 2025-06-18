import { uuidv4 } from '~/lib/utils';
import type {
  Position,
  Edge,
  TableData,
  ForeignKey,
  TableNode,
} from '~/utils/erd/type/index';
import { dbSchema } from '~/utils/index';

const LAYOUT_CONFIG = {
  BASE_X: -192,
  BASE_Y: -400,
  HORIZONTAL_STEP: 484, // 384 + 100 (width + spacing)
  VERTICAL_STEP: 900, // 800 + 100 (height + spacing)
  NODE_TYPE: 'value',
  EDGE_TYPE: 'smoothstep',
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

export const createNodes = (tablesData: TableData[]): TableNode[] => {
  const positions = generateGridPositions(tablesData.length);

  return tablesData.map((table, index) => ({
    id: table.table,
    type: LAYOUT_CONFIG.NODE_TYPE,
    position: positions[index],
    data: { value: table },
  }));
};

export const createEdges = (tablesData: TableData[]): Edge[][] => {
  return tablesData.map(table =>
    table.foreign_keys.map(foreignKey => ({
      id: uuidv4(),
      type: LAYOUT_CONFIG.EDGE_TYPE,
      source: table.table,
      target: foreignKey.reference_table,
      sourceHandle: foreignKey.column,
    }))
  );
};

export const filterTable = (tableNames: string[], tablesData: TableData[]) => {
  // Find initial tables and their direct relationships
  const selectedTables = tablesData.filter(table =>
    tableNames.includes(table.table)
  );

  // Get all related tables (including selected tables and their references)
  const relatedTableNames = new Set([
    ...tableNames,
    ...selectedTables.flatMap(table =>
      table.foreign_keys.map(key => key.reference_table)
    ),
  ]);

  // Filter tables based on related table names
  const filteredTables = tablesData.filter(table =>
    relatedTableNames.has(table.table)
  );

  return {
    filteredEdges: createEdges(filteredTables),
    filteredNodes: createNodes(filteredTables),
  };
};

// Initialize with default table
export const { filteredEdges, filteredNodes } = filterTable(
  ['achievement_badges', 'achievement_criteria'],
  dbSchema['tables']
);

export const initialEdges = filteredEdges;
export const initialNodes = filteredNodes;
