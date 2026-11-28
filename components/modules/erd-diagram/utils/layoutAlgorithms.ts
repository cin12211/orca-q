import type { TableMetadata } from '~/core/types';
import { HEAD_ROW_HEIGHT, ROW_WIDTH } from '../constants';
import { ErdLayoutAlgorithm, type MatrixTablePosition } from '../types';
import { buildTableNodeId, calcTableHeight } from './buildERDWithPrimaryTables';

/**
 * Auto-arrange algorithms for the ERD diagram.
 *
 * Every algorithm is a pure function of the visible tables: it returns the
 * top-left position of each table node. Edges point from the table that owns
 * the foreign key (child) to the referenced table (parent).
 */

const GAP_X = 200;
const GAP_Y = 60;
const COMPONENT_GAP = 160;

interface LayoutNode {
  id: string;
  width: number;
  height: number;
}

interface LayoutGraph {
  nodes: Map<string, LayoutNode>;
  /** child -> referenced parents */
  parents: Map<string, Set<string>>;
  /** parent -> children that reference it */
  children: Map<string, Set<string>>;
  /** undirected neighbours */
  neighbours: Map<string, Set<string>>;
}

interface Box {
  positions: MatrixTablePosition;
  width: number;
  height: number;
}

export interface ComputeErdLayoutOptions {
  tables: TableMetadata[];
  collapsedHeaderTables?: Set<string>;
}

const buildGraph = (
  tables: TableMetadata[],
  collapsedHeaderTables: Set<string>
): LayoutGraph => {
  const nodes = new Map<string, LayoutNode>();
  const parents = new Map<string, Set<string>>();
  const children = new Map<string, Set<string>>();
  const neighbours = new Map<string, Set<string>>();

  for (const table of tables) {
    const id = buildTableNodeId({
      schemaName: table.schema,
      tableName: table.table,
    });
    nodes.set(id, {
      id,
      width: ROW_WIDTH,
      height: collapsedHeaderTables.has(id)
        ? HEAD_ROW_HEIGHT
        : calcTableHeight(table.columns?.length),
    });
    parents.set(id, new Set());
    children.set(id, new Set());
    neighbours.set(id, new Set());
  }

  for (const table of tables) {
    const childId = buildTableNodeId({
      schemaName: table.schema,
      tableName: table.table,
    });
    for (const fk of table.foreign_keys ?? []) {
      const parentId = buildTableNodeId({
        schemaName: fk.reference_schema,
        tableName: fk.reference_table,
      });
      // Self references and tables outside the visible set don't shape layout
      if (parentId === childId || !nodes.has(parentId)) continue;
      parents.get(childId)!.add(parentId);
      children.get(parentId)!.add(childId);
      neighbours.get(childId)!.add(parentId);
      neighbours.get(parentId)!.add(childId);
    }
  }

  return { nodes, parents, children, neighbours };
};

const byId = (a: string, b: string) => a.localeCompare(b);

const degree = (graph: LayoutGraph, id: string) =>
  graph.neighbours.get(id)?.size ?? 0;

/** Connected components, largest first; isolated tables come back separately. */
const splitComponents = (
  graph: LayoutGraph
): { components: string[][]; isolated: string[] } => {
  const visited = new Set<string>();
  const components: string[][] = [];
  const isolated: string[] = [];

  for (const id of [...graph.nodes.keys()].sort(byId)) {
    if (visited.has(id)) continue;
    if (degree(graph, id) === 0) {
      visited.add(id);
      isolated.push(id);
      continue;
    }

    const component: string[] = [];
    const queue = [id];
    visited.add(id);
    while (queue.length) {
      const current = queue.shift()!;
      component.push(current);
      for (const next of [...graph.neighbours.get(current)!].sort(byId)) {
        if (visited.has(next)) continue;
        visited.add(next);
        queue.push(next);
      }
    }
    components.push(component);
  }

  components.sort((a, b) => b.length - a.length);
  return { components, isolated };
};

/**
 * Longest-path layering: referenced tables sit left of the tables that
 * reference them. Cycles are broken by ignoring edges that close a loop
 * during the DFS.
 */
const assignRanks = (
  graph: LayoutGraph,
  ids: string[]
): Map<string, number> => {
  const idSet = new Set(ids);
  const rank = new Map<string, number>();
  const visiting = new Set<string>();

  const visit = (id: string): number => {
    const known = rank.get(id);
    if (known !== undefined) return known;
    if (visiting.has(id)) return -1; // back edge, ignore
    visiting.add(id);

    let value = 0;
    for (const parent of graph.parents.get(id) ?? []) {
      if (!idSet.has(parent)) continue;
      const parentRank = visit(parent);
      if (parentRank >= 0) value = Math.max(value, parentRank + 1);
    }

    visiting.delete(id);
    rank.set(id, value);
    return value;
  };

  ids.forEach(visit);
  return rank;
};

/**
 * Pull nodes that only feed later layers right next to their closest child,
 * so FK chains stay short instead of every root piling up in column 0.
 */
const tightenRanks = (
  graph: LayoutGraph,
  ids: string[],
  rank: Map<string, number>
) => {
  const ordered = [...ids].sort((a, b) => rank.get(b)! - rank.get(a)!);
  for (const id of ordered) {
    if ((graph.parents.get(id)?.size ?? 0) > 0) continue;
    const childRanks = [...(graph.children.get(id) ?? [])]
      .map(child => rank.get(child))
      .filter((value): value is number => value !== undefined);
    if (!childRanks.length) continue;
    rank.set(id, Math.max(0, Math.min(...childRanks) - 1));
  }
};

/** Group ids by rank and reduce crossings with a few barycenter sweeps. */
const orderLayers = (
  graph: LayoutGraph,
  ids: string[],
  rank: Map<string, number>
): string[][] => {
  const maxRank = Math.max(0, ...ids.map(id => rank.get(id) ?? 0));
  const layers: string[][] = Array.from({ length: maxRank + 1 }, () => []);
  for (const id of [...ids].sort(byId)) layers[rank.get(id) ?? 0].push(id);

  const indexOf = new Map<string, number>();
  const reindex = () =>
    layers.forEach(layer => layer.forEach((id, i) => indexOf.set(id, i)));
  reindex();

  const sortByNeighbours = (layer: string[], adjacentRank: number) => {
    const barycenter = new Map<string, number>();
    layer.forEach((id, i) => {
      const adjacent = [...graph.neighbours.get(id)!].filter(
        n => rank.get(n) === adjacentRank
      );
      barycenter.set(
        id,
        adjacent.length
          ? adjacent.reduce((sum, n) => sum + indexOf.get(n)!, 0) /
              adjacent.length
          : i
      );
    });
    layer.sort((a, b) => barycenter.get(a)! - barycenter.get(b)!);
  };

  for (let sweep = 0; sweep < 4; sweep++) {
    for (let r = 1; r < layers.length; r++) sortByNeighbours(layers[r], r - 1);
    reindex();
    for (let r = layers.length - 2; r >= 0; r--)
      sortByNeighbours(layers[r], r + 1);
    reindex();
  }

  return layers.filter(layer => layer.length > 0);
};

/** Columns left to right; each column stacked vertically. */
const placeColumns = (
  graph: LayoutGraph,
  layers: string[][],
  align: 'center' | 'top'
): Box => {
  const heights = layers.map(
    layer =>
      layer.reduce((sum, id) => sum + graph.nodes.get(id)!.height, 0) +
      GAP_Y * Math.max(0, layer.length - 1)
  );
  const totalHeight = Math.max(0, ...heights);
  const positions: MatrixTablePosition = {};

  layers.forEach((layer, column) => {
    let y = align === 'center' ? (totalHeight - heights[column]) / 2 : 0;
    const x = column * (ROW_WIDTH + GAP_X);
    for (const id of layer) {
      positions[id] = { x, y };
      y += graph.nodes.get(id)!.height + GAP_Y;
    }
  });

  return {
    positions,
    width: layers.length * (ROW_WIDTH + GAP_X) - GAP_X,
    height: totalHeight,
  };
};

/**
 * Masonry grid: each table drops into the currently shortest column, which
 * keeps the overall shape close to a rectangle.
 */
const placeGrid = (graph: LayoutGraph, ids: string[]): Box => {
  if (!ids.length) return { positions: {}, width: 0, height: 0 };

  const cellWidth = ROW_WIDTH + GAP_X / 2;
  const totalHeight = ids.reduce(
    (sum, id) => sum + graph.nodes.get(id)!.height + GAP_Y,
    0
  );
  const columns = Math.max(
    1,
    Math.min(
      ids.length,
      Math.round(Math.sqrt(totalHeight * cellWidth) / cellWidth)
    )
  );

  const columnHeights = new Array<number>(columns).fill(0);
  const positions: MatrixTablePosition = {};
  for (const id of ids) {
    const column = columnHeights.indexOf(Math.min(...columnHeights));
    positions[id] = { x: column * cellWidth, y: columnHeights[column] };
    columnHeights[column] += graph.nodes.get(id)!.height + GAP_Y;
  }

  return {
    positions,
    width: columns * cellWidth - GAP_X / 2,
    height: Math.max(...columnHeights) - GAP_Y,
  };
};

const offset = (
  box: Box,
  dx: number,
  dy: number,
  into: MatrixTablePosition
) => {
  for (const [id, pos] of Object.entries(box.positions)) {
    into[id] = { x: pos.x + dx, y: pos.y + dy };
  }
};

/** Stack boxes top to bottom. */
const stackVertical = (boxes: Box[]): MatrixTablePosition => {
  const positions: MatrixTablePosition = {};
  let y = 0;
  for (const box of boxes) {
    if (!Object.keys(box.positions).length) continue;
    offset(box, 0, y, positions);
    y += box.height + COMPONENT_GAP;
  }
  return positions;
};

/** Shelf-pack boxes into rows so the result is roughly square. */
const packRows = (boxes: Box[]): MatrixTablePosition => {
  const filled = boxes.filter(box => Object.keys(box.positions).length);
  const area = filled.reduce(
    (sum, box) =>
      sum + (box.width + COMPONENT_GAP) * (box.height + COMPONENT_GAP),
    0
  );
  const maxRowWidth = Math.max(
    Math.sqrt(area),
    ...filled.map(box => box.width)
  );

  const positions: MatrixTablePosition = {};
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  for (const box of filled) {
    if (x > 0 && x + box.width > maxRowWidth) {
      x = 0;
      y += rowHeight + COMPONENT_GAP;
      rowHeight = 0;
    }
    offset(box, x, y, positions);
    x += box.width + COMPONENT_GAP;
    rowHeight = Math.max(rowHeight, box.height);
  }
  return positions;
};

const normalizeBox = (
  positions: MatrixTablePosition,
  graph: LayoutGraph
): Box => {
  const entries = Object.entries(positions);
  if (!entries.length) return { positions: {}, width: 0, height: 0 };

  const minX = Math.min(...entries.map(([, p]) => p.x));
  const minY = Math.min(...entries.map(([, p]) => p.y));
  const maxX = Math.max(
    ...entries.map(([id, p]) => p.x + graph.nodes.get(id)!.width)
  );
  const maxY = Math.max(
    ...entries.map(([id, p]) => p.y + graph.nodes.get(id)!.height)
  );

  const shifted: MatrixTablePosition = {};
  for (const [id, p] of entries) shifted[id] = { x: p.x - minX, y: p.y - minY };
  return { positions: shifted, width: maxX - minX, height: maxY - minY };
};

// ---------------------------------------------------------------------------
// Algorithms
// ---------------------------------------------------------------------------

/** Left to right following FK relationships, one block per connected group. */
const layoutLeftRight = (graph: LayoutGraph): MatrixTablePosition => {
  const { components, isolated } = splitComponents(graph);
  const boxes = components.map(ids => {
    const rank = assignRanks(graph, ids);
    tightenRanks(graph, ids, rank);
    return placeColumns(graph, orderLayers(graph, ids, rank), 'center');
  });
  boxes.push(placeGrid(graph, isolated));
  return stackVertical(boxes);
};

/**
 * Data-dependency lineage: stage N holds tables whose deepest dependency
 * sits in stage N-1. Tables without dependencies form the first stage.
 */
const layoutPipeline = (graph: LayoutGraph): MatrixTablePosition => {
  const ids = [...graph.nodes.keys()];
  const rank = assignRanks(graph, ids);
  return placeColumns(graph, orderLayers(graph, ids, rank), 'top').positions;
};

/** Radial rings around the most connected table of each connected group. */
const layoutSnowflakeComponent = (graph: LayoutGraph, ids: string[]): Box => {
  const idSet = new Set(ids);
  const center = [...ids].sort(
    (a, b) => degree(graph, b) - degree(graph, a) || byId(a, b)
  )[0];

  // BFS rings from the hub
  const rings: string[][] = [[center]];
  const parentOf = new Map<string, string>();
  const seen = new Set([center]);
  while (true) {
    const next: string[] = [];
    for (const id of rings[rings.length - 1]) {
      const around = [...graph.neighbours.get(id)!]
        .filter(n => idSet.has(n) && !seen.has(n))
        .sort((a, b) => degree(graph, b) - degree(graph, a) || byId(a, b));
      for (const n of around) {
        seen.add(n);
        parentOf.set(n, id);
        next.push(n);
      }
    }
    if (!next.length) break;
    rings.push(next);
  }

  const centers = new Map<string, { x: number; y: number }>();
  const angleOf = new Map<string, number>([[center, 0]]);
  centers.set(center, { x: 0, y: 0 });

  const maxHeight = (ring: string[]) =>
    Math.max(...ring.map(id => graph.nodes.get(id)!.height));

  let radius = 0;
  for (let r = 1; r < rings.length; r++) {
    // Keep children near their parent's angle so branches don't cross
    const ring = [...rings[r]].sort(
      (a, b) => angleOf.get(parentOf.get(a)!)! - angleOf.get(parentOf.get(b)!)!
    );
    const minStep =
      ROW_WIDTH + GAP_X + (maxHeight(rings[r - 1]) + maxHeight(ring)) / 4;
    const perimeterNeed = ring.reduce(
      (sum, id) =>
        sum + Math.max(ROW_WIDTH, graph.nodes.get(id)!.height) + GAP_Y,
      0
    );
    radius = Math.max(radius + minStep, perimeterNeed / (2 * Math.PI));

    // Start the ring where the first parent points so the shape stays balanced
    const start = r === 1 ? -Math.PI / 2 : angleOf.get(parentOf.get(ring[0])!)!;
    ring.forEach((id, i) => {
      const angle = start + (2 * Math.PI * i) / ring.length;
      angleOf.set(id, angle);
      centers.set(id, {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      });
    });
  }

  const positions: MatrixTablePosition = {};
  for (const [id, c] of centers) {
    const node = graph.nodes.get(id)!;
    positions[id] = { x: c.x - node.width / 2, y: c.y - node.height / 2 };
  }
  return normalizeBox(positions, graph);
};

const layoutSnowflake = (graph: LayoutGraph): MatrixTablePosition => {
  const { components, isolated } = splitComponents(graph);
  const boxes = components.map(ids => layoutSnowflakeComponent(graph, ids));
  boxes.push(placeGrid(graph, isolated));
  return packRows(boxes);
};

/** Compact rectangle; related tables stay next to each other. */
const layoutCompact = (graph: LayoutGraph): MatrixTablePosition => {
  const { components, isolated } = splitComponents(graph);
  return placeGrid(graph, [...components.flat(), ...isolated]).positions;
};

/**
 * Compute node positions for the given algorithm.
 * Returns `null` for `Default`, which keeps the original center-table layout.
 */
export const computeErdLayout = (
  algorithm: ErdLayoutAlgorithm,
  { tables, collapsedHeaderTables = new Set<string>() }: ComputeErdLayoutOptions
): MatrixTablePosition | null => {
  if (algorithm === ErdLayoutAlgorithm.Default) return null;
  if (!tables.length) return {};

  const graph = buildGraph(tables, collapsedHeaderTables);

  switch (algorithm) {
    case ErdLayoutAlgorithm.LeftRight:
      return layoutLeftRight(graph);
    case ErdLayoutAlgorithm.Pipeline:
      return layoutPipeline(graph);
    case ErdLayoutAlgorithm.Snowflake:
      return layoutSnowflake(graph);
    case ErdLayoutAlgorithm.Compact:
      return layoutCompact(graph);
    default:
      return null;
  }
};
