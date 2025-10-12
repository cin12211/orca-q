import { type Edge } from '@vue-flow/core';
import type { TableMetadata } from '~/server/api/get-tables';
import {
  DEFAULT_VUE_FLOW_LAYOUT_CONFIG,
  HEAD_ROW_HEIGHT,
  ROW_HEIGHT,
} from '../constants';
import type { TableNode } from '../type';
import { createEdges, createNodes } from './buildERDWithPrimaryTables';

const { HORIZONTAL_STEP, VERTICAL_STEP } = DEFAULT_VUE_FLOW_LAYOUT_CONFIG;

export interface Position {
  x: number;
  y: number;
}

interface TableRelationGraph {
  [tableId: string]: {
    connections: Set<string>;
    degree: number;
  };
}

/** Xây dựng graph liên kết giữa các bảng */
const buildRelationGraph = (
  tablesData: TableMetadata[]
): TableRelationGraph => {
  const graph: TableRelationGraph = {};

  for (const table of tablesData) {
    const tableId = `${table.schema}.${table.table}`;
    if (!graph[tableId]) graph[tableId] = { connections: new Set(), degree: 0 };

    for (const fk of table.foreign_keys) {
      const refId = `${fk.reference_schema}.${fk.reference_table}`;

      if (!graph[refId]) graph[refId] = { connections: new Set(), degree: 0 };

      graph[tableId].connections.add(refId);
      graph[refId].connections.add(tableId);
    }
  }

  for (const [_, node] of Object.entries(graph)) {
    node.degree = node.connections.size;
  }

  return graph;
};

/** Tìm bảng trung tâm có nhiều liên kết nhất */
const findCenterNode = (graph: TableRelationGraph): string => {
  return Object.entries(graph).sort((a, b) => b[1].degree - a[1].degree)[0][0];
};

/** Phân tầng bằng BFS (layering) */
const classifyLayers = (
  graph: TableRelationGraph,
  startId: string
): Record<string, number> => {
  const layers: Record<string, number> = {};
  const queue: { id: string; depth: number }[] = [{ id: startId, depth: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    layers[id] = depth;

    for (const conn of graph[id].connections) {
      if (!visited.has(conn)) queue.push({ id: conn, depth: depth + 1 });
    }
  }

  return layers;
};

/** Tính layout dựa trên chiều cao bảng thực tế */
const layoutGraph = (
  graph: TableRelationGraph,
  layers: Record<string, number>,
  tablesData: TableMetadata[]
): Record<string, Position> => {
  const matrix: Record<string, Position> = {};
  const mapTablesData = new Map(
    tablesData.map(table => [`${table.schema}.${table.table}`, table])
  );

  // gom nhóm các bảng theo layer
  const layerGroups: Record<number, string[]> = {};
  for (const [id, depth] of Object.entries(layers)) {
    if (!layerGroups[depth]) layerGroups[depth] = [];
    layerGroups[depth].push(id);
  }

  for (const [depthStr, ids] of Object.entries(layerGroups)) {
    const depth = Number(depthStr);

    // sắp theo degree giảm dần (bảng nhiều liên kết nằm giữa)
    ids.sort((a, b) => graph[b].degree - graph[a].degree);

    // tính tổng chiều cao layer
    const totalHeight = ids.reduce((sum, id) => {
      const table = mapTablesData.get(id);
      const tableHeight =
        (table?.columns?.length || 0) * ROW_HEIGHT +
        HEAD_ROW_HEIGHT +
        VERTICAL_STEP;
      return sum + tableHeight;
    }, 0);

    let currentYOffset = -totalHeight / 2;

    for (const id of ids) {
      const table = mapTablesData.get(id);
      const tableHeight =
        (table?.columns?.length || 0) * ROW_HEIGHT +
        HEAD_ROW_HEIGHT +
        VERTICAL_STEP;

      matrix[id] = {
        x: depth * HORIZONTAL_STEP,
        y: currentYOffset + tableHeight / 2,
      };

      currentYOffset += tableHeight;
    }
  }

  return matrix;
};

/** 🚀 Build full ERD cho toàn bộ schema */
export const buildFullERDDiagram = (
  tablesData: TableMetadata[]
): {
  nodes: TableNode[];
  edges: Edge[];
  centerId: string;
} => {
  if (!tablesData.length) return { nodes: [], edges: [], centerId: '' };

  const graph = buildRelationGraph(tablesData);
  const centerId = findCenterNode(graph);
  const layers = classifyLayers(graph, centerId);
  const matrix = layoutGraph(graph, layers, tablesData);

  // 🧩 Xử lý các bảng không có relation
  const isolatedTables = tablesData.filter(table => {
    const id = `${table.schema}.${table.table}`;
    const node = graph[id];
    return !node || node.connections.size === 0;
  });

  if (isolatedTables.length > 0) {
    // Tìm giới hạn layout hiện tại để đặt chúng ra ngoài vùng chính
    const maxX = Math.max(...Object.values(matrix).map(p => p.x));
    const minY = Math.min(...Object.values(matrix).map(p => p.y));

    let offsetY = minY - VERTICAL_STEP;

    for (const table of isolatedTables) {
      const id = `${table.schema}.${table.table}`;
      const tableHeight =
        (table.columns?.length || 0) * ROW_HEIGHT + HEAD_ROW_HEIGHT;

      matrix[id] = {
        x: maxX + HORIZONTAL_STEP * 1.5,
        y: offsetY,
      };

      offsetY -= tableHeight + VERTICAL_STEP;
    }
  }

  const nodes = createNodes(tablesData, matrix);
  const edges = createEdges(tablesData);

  return {
    nodes,
    edges,
    centerId,
  };
};
