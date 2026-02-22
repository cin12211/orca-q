import type { RowData } from '~/components/base/dynamic-table/utils';
import type { ExplainPlanNode } from '../../../../../interfaces/explainAnalyzeResult';

export interface ExplainGridRow {
  id: string;
  order: number;
  nodeType: string;
  relation?: string;
  alias?: string;
  sortKey?: string;
  joinType?: string;
  groupKey?: string;
  hashKey?: string;
  filter?: string;
  joinFilter?: string;
  oneTimeFilter?: string;
  indexCond?: string;
  hashCond?: string;
  mergeCond?: string;
  recheckCond?: string;
  tidCond?: string;
  cteName?: string;
  subplanName?: string;
  timeMs: number;
  rows: number;
  planRows: number;
  estimateRatio?: number;
  cost: number;
  width: number;
  loops: number;
  hitReadRatio?: number;
  depth?: number;
  indentPx: number;
  isSlowest: boolean;
  isExpensive: boolean;
  tooltipLines: string;
}

const NODE_TYPE_CATEGORIES: Record<string, string> = {
  'Seq Scan': 'scan',
  'Index Scan': 'scan',
  'Index Only Scan': 'scan',
  'Bitmap Index Scan': 'scan',
  'Bitmap Heap Scan': 'scan',
  'CTE Scan': 'scan',
  'Function Scan': 'scan',
  'Values Scan': 'scan',
  'Subquery Scan': 'scan',
  Aggregate: 'agg',
  HashAggregate: 'agg',
  GroupAggregate: 'agg',
  Sort: 'sort',
  'Incremental Sort': 'sort',
  Hash: 'hash',
  'Hash Join': 'join',
  'Merge Join': 'join',
  'Nested Loop': 'join',
};

const normalizeExplainValue = (value?: string) => {
  if (!value) return '';
  return String(value)
    .replace(/^[\[]|[\]]$/g, '')
    .replace(/"/g, '')
    .trim();
};

export const getNodeTypeCategory = (nodeType: string): string => {
  if (nodeType === 'Seq Scan') return 'bad';
  if (NODE_TYPE_CATEGORIES[nodeType]) return NODE_TYPE_CATEGORIES[nodeType];
  if (nodeType.includes('Join')) return 'join';
  if (nodeType.includes('Scan')) return 'scan';
  if (nodeType.includes('Aggregate')) return 'agg';
  if (nodeType.includes('Sort')) return 'sort';
  return 'other';
};

const hasFollowingSiblingAtDepth = (
  rows: ExplainGridRow[],
  fromIndex: number,
  depth: number
) => {
  for (let i = fromIndex + 1; i < rows.length; i++) {
    const d = rows[i].depth ?? 0;
    if (d < depth) return false;
    if (d === depth) return true;
  }
  return false;
};

export const buildTreePrefix = (rows: ExplainGridRow[], index: number) => {
  const row = rows[index];
  const depth = row.depth ?? 0;
  if (depth === 0) return '';

  const parts: string[] = [];
  for (let level = 1; level < depth; level++) {
    parts.push(hasFollowingSiblingAtDepth(rows, index, level) ? '│ ' : '  ');
  }
  const isLast = !hasFollowingSiblingAtDepth(rows, index, depth);
  parts.push(isLast ? '└─ ' : '├─ ');
  return parts.join('');
};

export const buildContext = (
  row: ExplainGridRow
): { label: string; kind: string } => {
  const hashCond = normalizeExplainValue(row.hashCond);
  const mergeCond = normalizeExplainValue(row.mergeCond);
  const joinFilter = normalizeExplainValue(row.joinFilter);
  const joinType = normalizeExplainValue(row.joinType).toLowerCase();

  if (joinType || hashCond || mergeCond || joinFilter) {
    const cond = hashCond || mergeCond || joinFilter;
    const prefix = joinType ? `${joinType} ` : '';
    return {
      label: cond ? `${prefix}on ${cond}`.trim() : `${prefix}join`.trim(),
      kind: 'join',
    };
  }

  const indexCond = normalizeExplainValue(row.indexCond);
  const recheckCond = normalizeExplainValue(row.recheckCond);
  const tidCond = normalizeExplainValue(row.tidCond);

  if (indexCond) {
    return { label: `on ${indexCond}`, kind: 'relation' };
  }

  if (recheckCond) {
    return { label: `recheck: ${recheckCond}`, kind: 'relation' };
  }

  if (tidCond) {
    return { label: `tid: ${tidCond}`, kind: 'relation' };
  }

  const sortKey = normalizeExplainValue(row.sortKey);
  if (sortKey) {
    return { label: `by ${sortKey}`, kind: 'sort' };
  }

  const groupKey = normalizeExplainValue(row.groupKey);
  const hashKey = normalizeExplainValue(row.hashKey);

  if (groupKey || hashKey) {
    return { label: `by ${groupKey || hashKey}`, kind: 'group' };
  }

  const oneTimeFilter = normalizeExplainValue(row.oneTimeFilter);
  if (oneTimeFilter) {
    return { label: `one-time: ${oneTimeFilter}`, kind: 'relation' };
  }

  const filter = normalizeExplainValue(row.filter);
  if (filter) {
    return { label: `filter: ${filter}`, kind: 'relation' };
  }

  const cteName = normalizeExplainValue(row.cteName);
  if (cteName) {
    return { label: `cte: ${cteName}`, kind: 'relation' };
  }

  const subplanName = normalizeExplainValue(row.subplanName);
  if (subplanName) {
    return { label: `subplan: ${subplanName}`, kind: 'relation' };
  }

  if (row.relation) {
    const aliasSuffix =
      row.alias && row.alias !== row.relation ? ` (${row.alias})` : '';
    return { label: `on ${row.relation}${aliasSuffix}`, kind: 'relation' };
  }

  return { label: '', kind: '' };
};

export const mapPlanNodesToGridRows = (
  nodes: ExplainPlanNode[]
): ExplainGridRow[] => {
  return [...nodes].map(node => {
    const planRows = node['Plan Rows'] || 0;
    const actualRows = node['Actual Rows'] || 0;
    const estimateRatio = node.estimateRatio;
    const startupMs = node['Actual Startup Time'] || 0;
    const width = node['Plan Width'] || 0;
    const estimateStatus = node.rowEstimateAccuracy || 'accurate';

    const tooltipLines = [
      `Node: ${node['Node Type']}`,
      node['Relation Name'] ? `Relation: ${node['Relation Name']}` : '',
      `Depth: ${node.depth}`,
      `Startup time: ${startupMs.toFixed(3)} ms`,
      `Total time: ${(node['Actual Total Time'] || 0).toFixed(3)} ms`,
      `Actual rows: ${actualRows.toLocaleString()}`,
      `Plan rows: ${planRows.toLocaleString()}`,
      estimateRatio !== undefined
        ? `Estimate ratio: ${estimateRatio}x (${estimateStatus})`
        : 'Estimate ratio: -',
      `Total cost: ${(node['Total Cost'] || 0).toFixed(2)}`,
      `Plan width: ${width}`,
      `Loops: ${(node['Actual Loops'] || 0).toLocaleString()}`,
      `Slowest: ${node.isSlowest ? 'yes' : 'no'}`,
      `Expensive: ${node.isExpensive ? 'yes' : 'no'}`,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      id: node.id,
      order: node.index,
      nodeType: node['Node Type'],
      relation: node['Relation Name'],
      alias: node.Alias,
      sortKey: node['Sort Key']?.join(', ') ?? '',
      joinType: node['Join Type'] ?? '',
      groupKey: node['Group Key']?.join(', ') ?? '',
      hashKey: '',
      filter: node.Filter ?? '',
      joinFilter: '',
      oneTimeFilter: '',
      indexCond: '',
      hashCond: node['Hash Cond'] ?? '',
      mergeCond: node['Merge Cond'] ?? '',
      recheckCond: '',
      tidCond: '',
      cteName: '',
      subplanName: '',
      timeMs: node['Actual Total Time'] || 0,
      rows: actualRows,
      planRows,
      estimateRatio,
      cost: node['Total Cost'] || 0,
      width,
      loops: node['Actual Loops'] || 0,
      depth: node.depth,
      indentPx: node.depth * 16,
      hitReadRatio: node.hitReadRatio,
      isSlowest: node.isSlowest,
      isExpensive: node.isExpensive,
      tooltipLines,
    };
  });
};

export const mapGridRowsToTableRows = (rows: ExplainGridRow[]): RowData[] => {
  const totalQueryTimeMs =
    rows.reduce((sum, row) => sum + (row.timeMs || 0), 0) || 1;

  return rows.map((row, index) => {
    const treePrefix = buildTreePrefix(rows, index);
    const { label: contextLabel, kind: contextKind } = buildContext(row);

    const status = row.isSlowest
      ? 'slowest'
      : row.isExpensive
        ? 'expensive'
        : 'normal';

    return {
      order: row.order,
      timeMs: row.timeMs,
      rows: row.rows,
      planRows: row.planRows,
      estimateRatioValue: row.estimateRatio,
      cost: row.cost,
      width: row.width,
      loops: row.loops,
      hitReadRatio: row.hitReadRatio,
      isSlowest: row.isSlowest,
      isExpensive: row.isExpensive,

      orderLabel: `${row.order}`,
      queryPercentLabel: `${((row.timeMs / totalQueryTimeMs) * 100).toFixed(2)}%`,
      timeSpentLabel: `${row.timeMs.toFixed(3)} ms`,
      rowsLabel: row.rows.toLocaleString(),
      planRowsLabel: row.planRows.toLocaleString(),
      estimateLabel:
        row.estimateRatio !== undefined ? `${row.estimateRatio}×` : '-',
      costLabel: row.cost.toFixed(2),
      widthLabel: row.width,
      loopsLabel: row.loops.toLocaleString(),
      hitReadRatioLabel:
        row.hitReadRatio !== undefined
          ? `${(row.hitReadRatio * 100).toFixed(2)}%`
          : '-',
      statusLabel: status,

      treePrefix,
      nodeType: row.nodeType,
      nodeTypeCategory: getNodeTypeCategory(row.nodeType),
      contextLabel,
      contextKind,
    };
  });
};
