import type { QueryPlan } from './types';

const getPlanString = (node: QueryPlan, key: string) => {
  const value = node[key];
  return typeof value === 'string' ? value : '';
};

const getPlanNumber = (node: QueryPlan, key: string) => {
  const value = Number(node[key]);
  return Number.isFinite(value) ? value : 0;
};

export function formatPlanTree(node: QueryPlan, depth = 0): string[] {
  const indent = '  '.repeat(depth);
  const relationName = getPlanString(node, 'Relation Name');
  const relationSuffix = relationName ? ` on ${relationName}` : '';
  const cost = `${getPlanNumber(node, 'Startup Cost').toFixed(2)}..${getPlanNumber(node, 'Total Cost').toFixed(2)}`;
  const actualTotalTime = getPlanNumber(node, 'Actual Total Time');
  const actual =
    actualTotalTime > 0 ? ` actual=${actualTotalTime.toFixed(2)}ms` : '';
  const currentLine = `${indent}${getPlanString(node, 'Node Type')}${relationSuffix} (cost=${cost}${actual})`;
  const childLines = Array.isArray(node.Plans)
    ? node.Plans.flatMap(child => formatPlanTree(child, depth + 1))
    : [];

  return [currentLine, ...childLines];
}

export function findSlowestPlanNode(node: QueryPlan): QueryPlan {
  const children = Array.isArray(node.Plans) ? node.Plans : [];

  return children.reduce((slowest, child) => {
    const nestedSlowest = findSlowestPlanNode(child);
    const slowestCost =
      getPlanNumber(slowest, 'Actual Total Time') ||
      getPlanNumber(slowest, 'Total Cost');
    const nestedCost =
      getPlanNumber(nestedSlowest, 'Actual Total Time') ||
      getPlanNumber(nestedSlowest, 'Total Cost');

    return nestedCost > slowestCost ? nestedSlowest : slowest;
  }, node);
}

export function buildExplainSuggestions(slowestNode: QueryPlan) {
  const suggestions: string[] = [];
  const nodeType = getPlanString(slowestNode, 'Node Type');
  const relationName = getPlanString(slowestNode, 'Relation Name').trim();
  const filter = getPlanString(slowestNode, 'Filter').trim();
  const sortKey = Array.isArray(slowestNode['Sort Key'])
    ? slowestNode['Sort Key'].map(value => String(value)).join(', ')
    : '';

  if (nodeType.includes('Seq Scan') && relationName) {
    suggestions.push(
      `Consider an index on ${relationName}${filter ? ` for filter ${filter}` : ''}.`
    );
  }

  if (nodeType.includes('Sort') && sortKey) {
    suggestions.push(`Consider an index that supports ORDER BY ${sortKey}.`);
  }

  if (nodeType.includes('Nested Loop') || nodeType.includes('Hash Join')) {
    suggestions.push(
      'Review join predicates and ensure join keys are indexed.'
    );
  }

  if (suggestions.length === 0) {
    suggestions.push(
      'Review the slowest plan node, filter predicates, and row estimates before tuning.'
    );
  }

  return suggestions;
}

export function buildExplainSummary(slowestNode: QueryPlan) {
  const nodeType = getPlanString(slowestNode, 'Node Type') || 'Plan node';
  const relationName = getPlanString(slowestNode, 'Relation Name').trim();
  const cost =
    getPlanNumber(slowestNode, 'Actual Total Time') ||
    getPlanNumber(slowestNode, 'Total Cost');

  if (relationName) {
    return `${nodeType} on ${relationName} is the dominant cost in this plan (${cost.toFixed(2)}).`;
  }

  return `${nodeType} is the dominant cost in this plan (${cost.toFixed(2)}).`;
}
