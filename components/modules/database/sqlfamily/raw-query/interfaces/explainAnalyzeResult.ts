export type ExplainAnalyzeResult = ExplainRoot[];

export interface ExplainRoot {
  Plan: PlanNode;
  Settings?: Settings;
  'Query Identifier'?: number;
  Planning?: PlanningStats;
  'Planning Time'?: number;
  Triggers?: unknown[];
  Serialization?: SerializationStats;
  'Execution Time'?: number;
}

/* ============================= */
/* ========= PLAN NODE ========= */
/* ============================= */

export interface PlanNode {
  /* Core */
  'Node Type': string;
  'Parent Relationship'?: string;
  'Parallel Aware'?: boolean;
  'Async Capable'?: boolean;

  /* Cost Estimation */
  'Startup Cost'?: number;
  'Total Cost'?: number;
  'Plan Rows'?: number;
  'Plan Width'?: number;

  /* Actual Execution */
  'Actual Startup Time'?: number;
  'Actual Total Time'?: number;
  'Actual Rows'?: number;
  'Actual Loops'?: number;

  /* Output */
  Output?: string[];

  /* Join */
  'Join Type'?: string;
  'Inner Unique'?: boolean;
  'Hash Cond'?: string;
  'Merge Cond'?: string;

  /* Scan */
  'Relation Name'?: string;
  Schema?: string;
  Alias?: string;
  'Index Name'?: string;
  'Scan Direction'?: string;
  'Run Condition'?: string;

  /* Sort */
  'Sort Key'?: string[];
  'Sort Method'?: string;
  'Sort Space Used'?: number;
  'Sort Space Type'?: string;
  'Presorted Key'?: string[];
  'Full-sort Groups'?: FullSortGroups;

  /* Aggregate */
  Strategy?: string;
  'Partial Mode'?: string;
  'Group Key'?: string[];
  'Planned Partitions'?: number;
  'HashAgg Batches'?: number;

  /* Filter */
  Filter?: string;
  'Rows Removed by Filter'?: number;

  /* Hash */
  'Hash Buckets'?: number;
  'Original Hash Buckets'?: number;
  'Hash Batches'?: number;
  'Original Hash Batches'?: number;
  'Peak Memory Usage'?: number;
  'Disk Usage'?: number;

  /* Buffers */
  'Shared Hit Blocks'?: number;
  'Shared Read Blocks'?: number;
  'Shared Dirtied Blocks'?: number;
  'Shared Written Blocks'?: number;
  'Local Hit Blocks'?: number;
  'Local Read Blocks'?: number;
  'Local Dirtied Blocks'?: number;
  'Local Written Blocks'?: number;
  'Temp Read Blocks'?: number;
  'Temp Written Blocks'?: number;

  /* WAL */
  'WAL Records'?: number;
  'WAL FPI'?: number;
  'WAL Bytes'?: number;

  /* Recursive children */
  Plans?: PlanNode[];
}

/* ============================= */
/* ========= SUB TYPES ========= */
/* ============================= */

export interface FullSortGroups {
  'Group Count'?: number;
  'Sort Methods Used'?: string[];
  'Sort Space Memory'?: {
    'Average Sort Space Used'?: number;
    'Peak Sort Space Used'?: number;
  };
}

export interface Settings {
  effective_cache_size?: string;
  effective_io_concurrency?: string;
  maintenance_io_concurrency?: string;
}

export interface PlanningStats {
  'Shared Hit Blocks'?: number;
  'Shared Read Blocks'?: number;
  'Shared Dirtied Blocks'?: number;
  'Shared Written Blocks'?: number;
  'Local Hit Blocks'?: number;
  'Local Read Blocks'?: number;
  'Local Dirtied Blocks'?: number;
  'Local Written Blocks'?: number;
  'Temp Read Blocks'?: number;
  'Temp Written Blocks'?: number;
  'Memory Used'?: number;
  'Memory Allocated'?: number;
}

export interface SerializationStats {
  Time?: number;
  'Output Volume'?: number;
  Format?: string;
  'Shared Hit Blocks'?: number;
  'Shared Read Blocks'?: number;
  'Shared Dirtied Blocks'?: number;
  'Shared Written Blocks'?: number;
  'Local Hit Blocks'?: number;
  'Local Read Blocks'?: number;
  'Local Dirtied Blocks'?: number;
  'Local Written Blocks'?: number;
  'Temp Read Blocks'?: number;
  'Temp Written Blocks'?: number;
}

export interface ExplainPlanNode extends Omit<PlanNode, 'Plans'> {
  id: string;
  index: number;
  label: string;
  estimateRatio?: number;
  hitReadRatio?: number;
  isExpensive: boolean;
  isSlowest: boolean;
  rowEstimateAccuracy?: 'accurate' | 'underestimate' | 'overestimate';
  children: ExplainPlanNode[];
  depth: number;
}

export interface ExplainPlanSummary
  extends Pick<ExplainRoot, 'Planning Time' | 'Execution Time'> {
  totalCost?: number;
  triggersInfo: string[];
  jitInfo: string[];
  settingsInfo: string[];
  rawText: string;
}

export interface ParsedExplainPlan {
  root: ExplainPlanNode | null;
  summary: ExplainPlanSummary;
  allNodes: ExplainPlanNode[];
}
