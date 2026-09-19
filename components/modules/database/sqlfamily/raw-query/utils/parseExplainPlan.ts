import type {
  ExplainPlanNode,
  ExplainPlanSummary,
  ExplainRoot,
  ParsedExplainPlan,
  PlanNode,
} from '../interfaces/explainAnalyzeResult';

let nodeIdCounter = 0;

const nextId = () => {
  nodeIdCounter += 1;
  return `ep-${nodeIdCounter}`;
};

const toStringValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  return JSON.stringify(value);
};

const computeHitReadRatio = (node: PlanNode): number | undefined => {
  const hit =
    (node['Shared Hit Blocks'] ?? 0) + (node['Local Hit Blocks'] ?? 0);

  const read =
    (node['Shared Read Blocks'] ?? 0) + (node['Local Read Blocks'] ?? 0);

  const denominator = hit + read;
  if (denominator <= 0) return undefined;

  return Number((hit / denominator).toFixed(4));
};

// ─── Insights ─────────────────────────────────────────────────────────────────

const applyInsights = (node: ExplainPlanNode, planNode: PlanNode): void => {
  const planRows = planNode['Plan Rows'];
  const actualRows = planNode['Actual Rows'];

  if (
    planRows !== undefined &&
    actualRows !== undefined &&
    planRows > 0 &&
    actualRows >= 0
  ) {
    node.estimateRatio = Number((actualRows / planRows).toFixed(2));

    const ratio = actualRows / planRows;
    if (ratio > 10) {
      node.rowEstimateAccuracy = 'underestimate';
    } else if (ratio < 0.1) {
      node.rowEstimateAccuracy = 'overestimate';
    } else {
      node.rowEstimateAccuracy = 'accurate';
    }
  }

  node.hitReadRatio = computeHitReadRatio(planNode);

  if (
    (planNode['Total Cost'] !== undefined && planNode['Total Cost'] > 1000) ||
    (planNode['Actual Total Time'] !== undefined &&
      planNode['Actual Total Time'] > 100)
  ) {
    node.isExpensive = true;
  }
};

const computeSlowestNode = (allNodes: ExplainPlanNode[]): void => {
  let maxExclusiveTime = 0;
  let slowestNodeId = '';

  for (const node of allNodes) {
    const childTime =
      node.children.reduce(
        (sum, child) =>
          sum +
          (child['Actual Total Time'] ?? 0) * (child['Actual Loops'] ?? 1),
        0
      ) / (node['Actual Loops'] ?? 1);

    const exclusiveTime = Math.max(
      0,
      (node['Actual Total Time'] ?? 0) - childTime
    );

    if (exclusiveTime > maxExclusiveTime) {
      maxExclusiveTime = exclusiveTime;
      slowestNodeId = node.id;
    }
  }

  const slowestNode = allNodes.find(n => n.id === slowestNodeId);
  if (slowestNode) {
    slowestNode.isSlowest = true;
  }
};

// ─── Mapping ──────────────────────────────────────────────────────────────────

const mapPlanNode = (
  planNode: PlanNode,
  depth: number,
  allNodes: ExplainPlanNode[]
): ExplainPlanNode => {
  const { Plans, ...rest } = planNode;

  const nodeType = planNode['Node Type'] || 'Unknown Node';
  const relation = planNode['Relation Name'];

  const node: ExplainPlanNode = {
    // Spread all original PlanNode fields (except Plans which becomes children)
    ...rest,
    // Add new fields
    id: nextId(),
    index: nodeIdCounter,
    label: relation ? `${nodeType} on ${relation}` : nodeType,
    estimateRatio: undefined,
    hitReadRatio: undefined,
    isExpensive: false,
    isSlowest: false,
    rowEstimateAccuracy: undefined,
    depth,
    children: (Plans ?? []).map(child =>
      mapPlanNode(child, depth + 1, allNodes)
    ),
  };

  allNodes.push(node);
  applyInsights(node, planNode);

  return node;
};

// ─── Parse ────────────────────────────────────────────────────────────────────

const parseExplainRoot = (
  explainRoot: ExplainRoot,
  rawText: string
): ParsedExplainPlan => {
  nodeIdCounter = 0;
  const allNodes: ExplainPlanNode[] = [];

  const root = mapPlanNode(explainRoot.Plan, 0, allNodes);

  const summary: ExplainPlanSummary = {
    'Planning Time': explainRoot['Planning Time'],
    'Execution Time': explainRoot['Execution Time'],
    totalCost: root['Total Cost'],
    triggersInfo: (explainRoot.Triggers ?? []).map(toStringValue),
    jitInfo: [],
    settingsInfo: explainRoot.Settings
      ? Object.entries(explainRoot.Settings).map(
          ([k, v]) => `${k}: ${toStringValue(v)}`
        )
      : [],
    rawText,
  };

  computeSlowestNode(allNodes);

  const sortedNodes = [...allNodes].sort((a, b) => a.index - b.index);

  return { root, summary, allNodes: sortedNodes };
};

const parseExplainPlanTextFallback = (rawText: string): ParsedExplainPlan => {
  const summary: ExplainPlanSummary = {
    triggersInfo: [],
    jitInfo: [],
    settingsInfo: [],
    rawText,
  };

  const planningMatch = rawText.match(/Planning Time:\s*(\d+\.?\d*)\s*ms/i);
  const executionMatch = rawText.match(/Execution Time:\s*(\d+\.?\d*)\s*ms/i);

  if (planningMatch)
    summary['Planning Time'] = Number.parseFloat(planningMatch[1]);
  if (executionMatch)
    summary['Execution Time'] = Number.parseFloat(executionMatch[1]);

  return { root: null, summary, allNodes: [] };
};

// ─── Normalize ────────────────────────────────────────────────────────────────

const toExplainRoot = (value: unknown): ExplainRoot | null => {
  if (!value) return null;

  if (typeof value === 'string') {
    try {
      return toExplainRoot(JSON.parse(value));
    } catch {
      return null;
    }
  }

  if (Array.isArray(value)) {
    return value.length ? toExplainRoot(value[0]) : null;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'Plan' in value &&
    typeof (value as ExplainRoot).Plan === 'object'
  ) {
    return value as ExplainRoot;
  }

  return null;
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const extractExplainPayload = (
  rows: unknown[],
  fieldDefs?: { name: string }[]
): unknown => {
  if (!rows?.length) return null;

  if (Array.isArray(rows[0])) {
    return (rows[0] as unknown[])[0] ?? null;
  }

  if (typeof rows[0] === 'object' && rows[0] !== null) {
    const firstRow = rows[0] as Record<string, unknown>;
    const preferredKey =
      Object.keys(firstRow).find(key => key.toUpperCase() === 'QUERY PLAN') ||
      fieldDefs?.[0]?.name ||
      Object.keys(firstRow)[0];

    if (!preferredKey) return null;
    return firstRow[preferredKey] ?? null;
  }

  return rows[0] ?? null;
};

export const extractExplainText = (
  rows: unknown[],
  fieldDefs?: { name: string }[]
): string => {
  const payload = extractExplainPayload(rows, fieldDefs);
  if (payload === null || payload === undefined) return '';
  if (typeof payload === 'string') return payload;
  return JSON.stringify(payload, null, 2);
};

export const parseExplainPlan = (rawInput: unknown): ParsedExplainPlan => {
  const rawText =
    typeof rawInput === 'string' ? rawInput : JSON.stringify(rawInput, null, 2);

  const explainRoot = toExplainRoot(rawInput);
  if (explainRoot) {
    return parseExplainRoot(explainRoot, rawText);
  }

  return parseExplainPlanTextFallback(rawText);
};
