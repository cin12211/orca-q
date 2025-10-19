import { type Edge } from '@vue-flow/core';
import type { TableMetadata } from '~/server/api/get-tables';
import {
  DEFAULT_VUE_FLOW_LAYOUT_CONFIG,
  ROW_HEIGHT,
  HEAD_ROW_HEIGHT,
} from '../constants';
import type { MatrixTablePosition, NodePosition, TableNode } from '../type';

export const calcTableHeight = (columnsLength?: number): number =>
  (columnsLength || 0) * ROW_HEIGHT + HEAD_ROW_HEIGHT;

export const buildTableNodeId = ({
  tableName,
  schemaName,
}: {
  tableName: string;
  schemaName: string;
}): string => {
  return `${schemaName}.${tableName}`;
};

export const detructTableNodeId = (
  nodeId: string
): {
  schemaName: string;
  tableName: string;
} => {
  const [schemaName, tableName] = nodeId.split('.');
  return { schemaName, tableName };
};

export const buildEdgeId = ({
  schemaName,
  tableName,
  reference_schema,
  reference_table,
  column,
}: {
  schemaName: string;
  reference_schema: string;
  tableName: string;
  reference_table: string;
  column: string;
}): string => {
  return `${schemaName}.${tableName}-${reference_schema}.${reference_table}.${column}`;
};

const { EDGE_TYPE, HORIZONTAL_STEP, NODE_TYPE, VERTICAL_STEP } =
  DEFAULT_VUE_FLOW_LAYOUT_CONFIG;

const classifyLayerTables = ({
  mapTablesData,
  startId,
}: {
  mapTablesData: Map<string, TableMetadata>;
  startId: string;
}) => {
  const matrix: Record<string, number> = {};
  const queue: { id: string; depth: number }[] = [{ id: startId, depth: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    matrix[id] = depth;

    const table = mapTablesData.get(id);
    if (!table) continue;

    // duyệt các bảng mà bảng này FK tới
    for (const fk of table.foreign_keys) {
      const refId = buildTableNodeId({
        schemaName: fk.reference_schema,
        tableName: fk.reference_table,
      });

      if (mapTablesData.has(refId) && !visited.has(refId)) {
        queue.push({ id: refId, depth: depth + 1 });
      }
    }
  }

  return matrix;
};

const genLeftMatrixTable = (
  tablesData: TableMetadata[],
  tableCenterId: string,
  centerTable: TableMetadata
): Record<string, NodePosition> => {
  const mapTablesData = new Map(
    tablesData.map(table => [
      buildTableNodeId({
        schemaName: table.schema,
        tableName: table.table,
      }),
      table,
    ])
  );

  // make table center
  const matrix: Record<string, NodePosition> = {};

  // make table center
  matrix[tableCenterId] = {
    x: 0,
    y: 0,
  };

  const mapColumns = new Map(
    centerTable.columns.map((c, index) => [c.name, index])
  );

  const orderForeignKeys = centerTable.foreign_keys.sort((a, b) => {
    const aOrdinalPosition = mapColumns.get(a.column) || 0;

    const bOrdinalPosition = mapColumns.get(b.column) || 0;
    return aOrdinalPosition - bOrdinalPosition;
  });

  // find left
  const leftTableInfos = centerTable.foreign_keys;

  const leftWeightIndexMatrix: Record<string, number> = {};

  // classify left by layer
  leftTableInfos.forEach(leftTableInfo => {
    const leftTableId = buildTableNodeId({
      schemaName: leftTableInfo.reference_schema,
      tableName: leftTableInfo.reference_table,
    });

    if (!leftWeightIndexMatrix[leftTableId]) {
      const matrixWeights = classifyLayerTables({
        mapTablesData,
        startId: leftTableId,
      });

      Object.assign(leftWeightIndexMatrix, matrixWeights);
    }
  });

  const tableCountedYIndexMatrix = new Map<string, boolean>();
  let currentYOffset = 0;
  orderForeignKeys.forEach(foreignKey => {
    const leftTableId = buildTableNodeId({
      schemaName: foreignKey.reference_schema,
      tableName: foreignKey.reference_table,
    });

    const weight = leftWeightIndexMatrix[leftTableId] + 1;

    const referenceTable = mapTablesData.get(leftTableId);

    const referenceTableHeight =
      calcTableHeight(referenceTable?.columns?.length) + VERTICAL_STEP;

    if (!tableCountedYIndexMatrix.has(leftTableId)) {
      tableCountedYIndexMatrix.set(leftTableId, true);

      matrix[leftTableId] = {
        x: weight * HORIZONTAL_STEP * -1,
        y: currentYOffset,
      };

      currentYOffset += referenceTableHeight;
    }
  });

  return matrix;
};

const classifyLayerTablesRight = ({
  mapTablesData,
  currentWeight,
  currentLeafId,
  currentMatrix,
  visited = new Set<string>(),
}: {
  mapTablesData: Map<string, TableMetadata>;
  currentWeight: number;
  currentLeafId: string;
  currentMatrix: Record<string, number>;
  visited?: Set<string>;
}) => {
  if (visited.has(currentLeafId)) return currentMatrix;
  visited.add(currentLeafId);

  const currentTable = mapTablesData.get(currentLeafId);
  if (!currentTable) return currentMatrix;

  currentMatrix[currentLeafId] = currentWeight + 1;

  // find all tables that reference this one
  for (const [tableId, table] of mapTablesData.entries()) {
    for (const fk of table.foreign_keys) {
      const refId = buildTableNodeId({
        schemaName: fk.reference_schema,
        tableName: fk.reference_table,
      });

      if (refId === currentLeafId && !visited.has(tableId)) {
        classifyLayerTablesRight({
          mapTablesData,
          currentWeight: currentMatrix[currentLeafId],
          currentLeafId: tableId,
          currentMatrix,
          visited,
        });
      }
    }
  }

  return currentMatrix;
};

const centerAlignMatrixY = (
  matrix: Record<string, NodePosition>,
  centerId: string
) => {
  const center = matrix[centerId];
  if (!center) return matrix;

  // find all Y values (except center)
  const yValues = Object.entries(matrix)
    .filter(([id]) => id !== centerId)
    .map(([_, pos]) => pos.y);

  if (yValues.length === 0) return matrix;

  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const totalHeight = maxY - minY;

  // offset to center vertically
  const offsetY = totalHeight / 2;

  const centeredMatrix: Record<string, NodePosition> = {};
  for (const [id, pos] of Object.entries(matrix)) {
    centeredMatrix[id] = {
      x: pos.x,
      y: pos.y - offsetY,
    };
  }

  // ensure center table stays at y=0
  centeredMatrix[centerId] = { ...center, y: 0 };

  return centeredMatrix;
};

const genRightMatrixTable = (
  tablesData: TableMetadata[],
  tableCenterId: string,
  centerTable: TableMetadata
): Record<string, NodePosition> => {
  const mapTablesData = new Map(
    tablesData.map(table => [
      buildTableNodeId({
        schemaName: table.schema,
        tableName: table.table,
      }),
      table,
    ])
  );

  const matrix: Record<string, NodePosition> = {};

  // place center table
  matrix[tableCenterId] = { x: 0, y: 0 };

  // find all tables that reference the center
  const rightTables = tablesData.filter(table =>
    table.foreign_keys.some(
      fk =>
        fk.reference_schema === centerTable.schema &&
        fk.reference_table === centerTable.table
    )
  );

  const rightWeightIndexMatrix: Record<string, number> = {};

  rightTables.forEach(rightTable => {
    const rightTableId = buildTableNodeId({
      schemaName: rightTable.schema,
      tableName: rightTable.table,
    });

    if (!rightWeightIndexMatrix[rightTableId]) {
      classifyLayerTablesRight({
        mapTablesData,
        currentWeight: 0,
        currentLeafId: rightTableId,
        currentMatrix: rightWeightIndexMatrix,
      });
    }
  });

  const tableCountedYIndexMatrix = new Map<string, boolean>();
  let currentYOffset = 0;

  for (const table of rightTables) {
    const tableId = buildTableNodeId({
      schemaName: table.schema,
      tableName: table.table,
    });

    const weight = rightWeightIndexMatrix[tableId] ?? 1;

    const tableHeight = calcTableHeight(table.columns?.length) + VERTICAL_STEP;

    if (!tableCountedYIndexMatrix.has(tableId)) {
      tableCountedYIndexMatrix.set(tableId, true);
      matrix[tableId] = {
        x: weight * HORIZONTAL_STEP, // → right direction
        y: currentYOffset,
      };
      currentYOffset += tableHeight;
    }
  }

  return matrix;
};

const generateMatrixTableCenter = ({
  leftTables,
  rightTables,
  tableCenterId,
}: {
  leftTables: TableMetadata[];
  rightTables: TableMetadata[];
  tableCenterId: string;
}): MatrixTablePosition => {
  const mapTablesData = new Map(
    leftTables.map(table => [
      buildTableNodeId({
        schemaName: table.schema,
        tableName: table.table,
      }),
      table,
    ])
  );

  const centerTable = mapTablesData.get(tableCenterId);

  if (!centerTable) {
    return {};
  }

  const leftMatrix = genLeftMatrixTable(leftTables, tableCenterId, centerTable);
  const rightMatrix = genRightMatrixTable(
    rightTables,
    tableCenterId,
    centerTable
  );

  const leftAligned = centerAlignMatrixY(leftMatrix, tableCenterId);
  const rightAligned = centerAlignMatrixY(rightMatrix, tableCenterId);

  return {
    ...leftAligned,
    ...rightAligned,
  };
};

export const createNodes = (
  tablesData: TableMetadata[],
  matrix: Record<string, NodePosition>
): TableNode[] => {
  return tablesData.map(table => {
    const refId = buildTableNodeId({
      schemaName: table.schema,
      tableName: table.table,
    });

    const position = matrix[refId] || { x: 0, y: 0 };

    const node: TableNode = {
      id: refId,
      type: NODE_TYPE,
      position,
      data: table,
    };
    return node;
  });
};

export const createEdges = (tablesData: TableMetadata[]): Edge[] => {
  return tablesData.flatMap(table =>
    table.foreign_keys.map(foreignKey => {
      const edge: Edge = {
        id: buildEdgeId({
          schemaName: table.schema,
          tableName: table.table,
          reference_schema: foreignKey.reference_schema,
          reference_table: foreignKey.reference_table,
          column: foreignKey.column,
        }),
        type: EDGE_TYPE,
        source: buildTableNodeId({
          schemaName: table.schema,
          tableName: table.table,
        }),
        target: buildTableNodeId({
          schemaName: foreignKey.reference_schema,
          tableName: foreignKey.reference_table,
        }),
        sourceHandle: foreignKey.column,
        targetHandle: foreignKey.reference_column,
        updatable: false,
      };
      return edge;
    })
  );
};

export const getTablesByTableCenterId = (
  tableCenterId: string,
  tablesData: TableMetadata[]
) => {
  const tableNameSet = new Set([tableCenterId]);
  // this only get table usage with selected fk field
  const rightTables: TableMetadata[] = [];
  const relatedTableNames = new Set([tableCenterId]);

  // Single pass to find usage tables and related tables
  for (const table of tablesData) {
    const tableId = buildTableNodeId({
      schemaName: table.schema,
      tableName: table.table,
    });

    const isInTableNames = tableNameSet.has(tableId);

    if (isInTableNames) {
      // Add all referenced tables from selected tables
      for (const fk of table.foreign_keys) {
        relatedTableNames.add(
          buildTableNodeId({
            schemaName: fk.reference_schema,
            tableName: fk.reference_table,
          })
        );
      }
    } else {
      // Check if this table references any selected table
      for (const fk of table.foreign_keys) {
        const fkTableId = buildTableNodeId({
          schemaName: fk.reference_schema,
          tableName: fk.reference_table,
        });

        if (tableNameSet.has(fkTableId)) {
          rightTables.push(table);
          break;
        }
      }
    }
  }

  // Filter tables based on related table names
  const leftTables: TableMetadata[] = [];
  for (const table of tablesData) {
    const tableId = buildTableNodeId({
      schemaName: table.schema,
      tableName: table.table,
    });

    if (relatedTableNames.has(tableId)) {
      leftTables.push(table);
    }
  }

  // Merge tables
  const tables = leftTables.concat(rightTables);
  return { tables, leftTables, rightTables, tableCenterId };
};

export const buildERDWithPrimaryTables = ({
  tables,
  leftTables,
  rightTables,
  tableCenterId,
}: {
  tables: TableMetadata[];
  leftTables: TableMetadata[];
  rightTables: TableMetadata[];
  tableCenterId: string;
}) => {
  const matrixPosition = generateMatrixTableCenter({
    leftTables,
    rightTables,
    tableCenterId,
  });

  return {
    edges: createEdges(tables),
    nodes: createNodes(tables, matrixPosition),
    matrixPosition,
  };
};

/**
 * Automatically arrange tables and edges around a center table
 * @param tablesData - The full list of table metadata (from schema)
 * @param centerTableId - The selected table id to center layout around
 * @returns { nodes, edges } for Vue Flow
 */
export const arrangeDiagram = ({
  tables,
  leftTables,
  rightTables,
  tableCenterId,
}: {
  tables: TableMetadata[];
  leftTables: TableMetadata[];
  rightTables: TableMetadata[];
  tableCenterId: string;
}): {
  nodes: ReturnType<typeof buildERDWithPrimaryTables>['nodes'];
  edges: Edge[];
} => {
  // reuse your existing ERD builder for primary table layout
  const { nodes, edges } = buildERDWithPrimaryTables({
    tables,
    leftTables,
    rightTables,
    tableCenterId,
  });

  // optional: normalize or shift layout so everything is visible
  const minX = Math.min(...nodes.map(n => n.position.x));
  const minY = Math.min(...nodes.map(n => n.position.y));

  // shift all nodes to start from (0,0) top-left
  const normalizedNodes = nodes.map(n => ({
    ...n,
    position: {
      x: n.position.x - minX + 200, // small padding
      y: n.position.y - minY + 200,
    },
  }));

  return { nodes: normalizedNodes, edges };
};
