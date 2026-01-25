import { computed, ref, watch, type Ref } from 'vue';
import type { Edge } from '@vue-flow/core';
import type { TableMetadata } from '~/server/api/get-tables';
import { DEFAULT_VUE_FLOW_LAYOUT_CONFIG } from '../constants';
import type { MatrixTablePosition, TableNode } from '../type';
import {
  buildTableNodeId,
  createEdges,
  createNodes,
  calcTableHeight,
  getTablesByTableCenterId,
  buildERDWithPrimaryTables,
  buildFullERDDiagram,
} from '../utils';

const { HORIZONTAL_STEP, VERTICAL_STEP } = DEFAULT_VUE_FLOW_LAYOUT_CONFIG;

export interface UseExpandableErdOptions {
  allTables: Ref<TableMetadata[]>;
  initialTableId: Ref<string | undefined>;
  autoExpandInitial?: boolean;
}

export interface ExpandableErdReturn {
  expandedTables: Ref<Set<string>>;
  visibleNodes: Ref<TableNode[]>;
  visibleEdges: Ref<Edge[]>;
  expandTable: (tableId: string) => void;
  collapseTable: (tableId: string) => void;
  isExpanded: (tableId: string) => boolean;
  hasRelations: (tableId: string) => boolean;
  matrixPosition: Ref<MatrixTablePosition>;
}

/**
 * Get tables that are directly related to a given table
 * - Tables that this table references via FK (left side)
 * - Tables that reference this table via FK (right side)
 */
export const getDirectRelatedTables = (
  tableId: string,
  allTables: TableMetadata[]
): { leftTables: TableMetadata[]; rightTables: TableMetadata[] } => {
  const tableMap = new Map(
    allTables.map(t => [
      buildTableNodeId({ schemaName: t.schema, tableName: t.table }),
      t,
    ])
  );

  const currentTable = tableMap.get(tableId);
  if (!currentTable) {
    return { leftTables: [], rightTables: [] };
  }

  // Left tables: tables that this table references via FK
  const leftTables: TableMetadata[] = [];
  for (const fk of currentTable.foreign_keys) {
    const refId = buildTableNodeId({
      schemaName: fk.reference_schema,
      tableName: fk.reference_table,
    });
    const refTable = tableMap.get(refId);
    if (refTable && refId !== tableId) {
      leftTables.push(refTable);
    }
  }

  // Right tables: tables that reference this table via FK
  const rightTables: TableMetadata[] = [];
  for (const table of allTables) {
    const tId = buildTableNodeId({
      schemaName: table.schema,
      tableName: table.table,
    });
    if (tId === tableId) continue;

    for (const fk of table.foreign_keys) {
      const refId = buildTableNodeId({
        schemaName: fk.reference_schema,
        tableName: fk.reference_table,
      });
      if (refId === tableId) {
        rightTables.push(table);
        break;
      }
    }
  }

  return { leftTables, rightTables };
};

/**
 * BFS to classify tables by depth following FK chain (left side - tables being referenced)
 * From startId, follow FKs to find depth of each table
 */
const classifyLayerTablesLeft = ({
  mapTablesData,
  startId,
}: {
  mapTablesData: Map<string, TableMetadata>;
  startId: string;
}): Record<string, number> => {
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

    // Follow FKs to referenced tables
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

/**
 * Recursive function to classify tables by depth following reverse FK chain (right side - tables referencing)
 */
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
}): Record<string, number> => {
  if (visited.has(currentLeafId)) return currentMatrix;
  visited.add(currentLeafId);

  const currentTable = mapTablesData.get(currentLeafId);
  if (!currentTable) return currentMatrix;

  currentMatrix[currentLeafId] = currentWeight + 1;

  // Find all tables that reference this one
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

export function useExpandableErd(
  options: UseExpandableErdOptions
): ExpandableErdReturn {
  const { allTables, initialTableId, autoExpandInitial = true } = options;

  // Track which tables have been expanded
  const expandedTables = ref(new Set<string>());

  // Track which tables are currently visible (by tableId)
  const visibleTableIds = ref(new Set<string>());

  // Track who added each table (for collapse logic)
  const addedByMap = ref(new Map<string, Set<string>>());

  // Matrix position for layout using original algorithm
  const matrixPosition = ref<MatrixTablePosition>({});

  // Track next Y offset per layer (depth) to prevent overlaps
  const layerNextY = ref(new Map<number, number>());

  /**
   * Initialize with center table and use original buildERDWithPrimaryTables layout
   */
  const initializeERD = (centerId: string) => {
    // Reset state
    visibleTableIds.value.clear();
    expandedTables.value.clear();
    addedByMap.value.clear();
    matrixPosition.value = {};
    layerNextY.value.clear();

    if (!autoExpandInitial) {
      // Just show center table
      visibleTableIds.value.add(centerId);
      matrixPosition.value[centerId] = { x: 0, y: 0 };
      return;
    }

    // Use original algorithm to get tables and positions
    const result = getTablesByTableCenterId(centerId, allTables.value);
    if (!result) return;

    const { nodes, matrixPosition: originalMatrix } =
      buildERDWithPrimaryTables(result);

    // Copy positions from original algorithm
    for (const node of nodes) {
      visibleTableIds.value.add(node.id);
      matrixPosition.value[node.id] = node.position;

      // Track as added by initial
      addedByMap.value.set(node.id, new Set(['__initial__']));
    }

    // Mark center as expanded
    expandedTables.value.add(centerId);

    // Initialize layer Y offsets based on original positions
    initializeLayerOffsets();
  };

  /**
   * Initialize full ERD with all tables when no initial table is specified
   * Uses buildFullERDDiagram for optimal layout with connection-based center
   */
  const initializeFullERD = () => {
    // Reset state
    visibleTableIds.value.clear();
    expandedTables.value.clear();
    addedByMap.value.clear();
    matrixPosition.value = {};
    layerNextY.value.clear();

    if (allTables.value.length === 0) return;

    // Use full ERD algorithm
    const { nodes, edges, centerId } = buildFullERDDiagram(allTables.value);

    // Copy positions from full ERD algorithm
    for (const node of nodes) {
      visibleTableIds.value.add(node.id);
      matrixPosition.value[node.id] = node.position;

      // Track as added by initial
      addedByMap.value.set(node.id, new Set(['__initial__']));
    }

    // Mark center as expanded (if exists)
    if (centerId) {
      expandedTables.value.add(centerId);
    }

    // Initialize layer Y offsets
    initializeLayerOffsets();
  };

  /**
   * Initialize layer Y offsets based on current positions
   * This ensures new tables are placed below existing ones
   */
  const initializeLayerOffsets = () => {
    layerNextY.value.clear();

    // Group tables by X position (which represents layer/depth)
    const tablesByX = new Map<number, { y: number; height: number }[]>();

    for (const [tableId, pos] of Object.entries(matrixPosition.value)) {
      const table = allTables.value.find(t => {
        const tId = buildTableNodeId({
          schemaName: t.schema,
          tableName: t.table,
        });
        return tId === tableId;
      });

      if (table) {
        const height = calcTableHeight(table.columns?.length) + VERTICAL_STEP;
        const xKey = Math.round(pos.x / HORIZONTAL_STEP); // Normalize to layer index

        if (!tablesByX.has(xKey)) {
          tablesByX.set(xKey, []);
        }
        tablesByX.get(xKey)!.push({ y: pos.y, height });
      }
    }

    // Calculate next Y for each layer
    for (const [xKey, tables] of tablesByX.entries()) {
      const maxBottom = Math.max(...tables.map(t => t.y + t.height));
      layerNextY.value.set(xKey, maxBottom);
    }
  };

  /**
   * Calculate position for a new table using original depth logic
   */
  const calculatePositionForTable = (
    table: TableMetadata,
    expandingFromId: string,
    direction: 'left' | 'right'
  ): { x: number; y: number } => {
    const tableHeight = calcTableHeight(table.columns?.length) + VERTICAL_STEP;
    const tableMap = new Map(
      allTables.value.map(t => [
        buildTableNodeId({ schemaName: t.schema, tableName: t.table }),
        t,
      ])
    );

    const tableId = buildTableNodeId({
      schemaName: table.schema,
      tableName: table.table,
    });

    // Get depth using BFS from the table being expanded
    let depth = 1;

    if (direction === 'left') {
      // Calculate depth by following FK chain
      const depthMatrix = classifyLayerTablesLeft({
        mapTablesData: tableMap,
        startId: tableId,
      });
      // The depth is relative to the table we're looking at
      depth = (depthMatrix[tableId] ?? 0) + 1;
    } else {
      // For right side, use recursive depth calculation
      const depthMatrix: Record<string, number> = {};
      classifyLayerTablesRight({
        mapTablesData: tableMap,
        currentWeight: 0,
        currentLeafId: tableId,
        currentMatrix: depthMatrix,
      });
      depth = depthMatrix[tableId] ?? 1;
    }

    // Get parent position
    const parentPos = matrixPosition.value[expandingFromId] || { x: 0, y: 0 };
    const parentXLayer = Math.round(parentPos.x / HORIZONTAL_STEP);

    // Calculate X based on depth and direction
    const targetXLayer =
      direction === 'left' ? parentXLayer - depth : parentXLayer + depth;

    const x = targetXLayer * HORIZONTAL_STEP;

    // Get next available Y for this layer
    const nextY = layerNextY.value.get(targetXLayer) ?? 0;

    // Update layer offset
    layerNextY.value.set(targetXLayer, nextY + tableHeight);

    return { x, y: nextY };
  };

  // Watch for initialTableId changes and re-initialize
  watch(
    [initialTableId, allTables],
    ([newId, tables]) => {
      if (tables.length === 0) return;

      if (newId) {
        // Initialize with specific table as center
        initializeERD(newId);
      } else {
        // No initial table - show all tables
        initializeFullERD();
      }
    },
    { immediate: true }
  );

  // Compute visible tables metadata
  const visibleTablesData = computed(() => {
    return allTables.value.filter(t => {
      const tId = buildTableNodeId({
        schemaName: t.schema,
        tableName: t.table,
      });
      return visibleTableIds.value.has(tId);
    });
  });

  // Compute visible nodes
  const visibleNodes = computed<TableNode[]>(() => {
    return createNodes(visibleTablesData.value, matrixPosition.value);
  });

  // Compute visible edges (only edges where both source and target are visible)
  const visibleEdges = computed<Edge[]>(() => {
    const allEdges = createEdges(visibleTablesData.value);
    return allEdges.filter(edge => {
      return (
        visibleTableIds.value.has(edge.source) &&
        visibleTableIds.value.has(edge.target)
      );
    });
  });

  const hasRelations = (tableId: string): boolean => {
    const { leftTables, rightTables } = getDirectRelatedTables(
      tableId,
      allTables.value
    );
    return leftTables.length > 0 || rightTables.length > 0;
  };

  const isExpanded = (tableId: string): boolean => {
    return expandedTables.value.has(tableId);
  };

  /**
   * Expand a table to show its related tables
   * Uses BFS-based depth calculation for proper FK chain positioning
   */
  const expandTable = (tableId: string) => {
    if (expandedTables.value.has(tableId)) return;

    const { leftTables, rightTables } = getDirectRelatedTables(
      tableId,
      allTables.value
    );

    // Add left tables with proper depth
    leftTables.forEach(table => {
      const tId = buildTableNodeId({
        schemaName: table.schema,
        tableName: table.table,
      });

      // Track who added this table
      if (!addedByMap.value.has(tId)) {
        addedByMap.value.set(tId, new Set());
      }
      addedByMap.value.get(tId)!.add(tableId);

      // Skip if already visible
      if (visibleTableIds.value.has(tId)) return;

      visibleTableIds.value.add(tId);
      matrixPosition.value[tId] = calculatePositionForTable(
        table,
        tableId,
        'left'
      );
    });

    // Add right tables with proper depth
    rightTables.forEach(table => {
      const tId = buildTableNodeId({
        schemaName: table.schema,
        tableName: table.table,
      });

      // Track who added this table
      if (!addedByMap.value.has(tId)) {
        addedByMap.value.set(tId, new Set());
      }
      addedByMap.value.get(tId)!.add(tableId);

      // Skip if already visible
      if (visibleTableIds.value.has(tId)) return;

      visibleTableIds.value.add(tId);
      matrixPosition.value[tId] = calculatePositionForTable(
        table,
        tableId,
        'right'
      );
    });

    expandedTables.value.add(tableId);
  };

  /**
   * Collapse a table to hide tables it added
   */
  const collapseTable = (tableId: string) => {
    if (!expandedTables.value.has(tableId)) return;

    const { leftTables, rightTables } = getDirectRelatedTables(
      tableId,
      allTables.value
    );

    const allRelated = [...leftTables, ...rightTables];

    // Remove tables that were added by this expansion
    for (const table of allRelated) {
      const tId = buildTableNodeId({
        schemaName: table.schema,
        tableName: table.table,
      });

      const addedBy = addedByMap.value.get(tId);
      if (addedBy) {
        addedBy.delete(tableId);

        // Only remove if no other table is keeping it visible
        if (addedBy.size === 0 && tId !== initialTableId.value) {
          visibleTableIds.value.delete(tId);
          delete matrixPosition.value[tId];
          addedByMap.value.delete(tId);

          // Also collapse this table if it was expanded
          if (expandedTables.value.has(tId)) {
            collapseTable(tId); // Recursive collapse
          }
        }
      }
    }

    expandedTables.value.delete(tableId);
  };

  return {
    expandedTables,
    visibleNodes,
    visibleEdges,
    expandTable,
    collapseTable,
    isExpanded,
    hasRelations,
    matrixPosition,
  };
}
