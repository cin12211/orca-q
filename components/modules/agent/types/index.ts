import type { UIMessage, UITool } from 'ai';
import type { AgentCommandOptionId } from '../constants/command-options';
import type { Schema } from '~/core/stores';
import type { TableDetails } from '~/core/types';

export const DB_AGENT_TOOL_NAMES = [
  'generate_query',
  'render_table',
  'visualize_table',
  'explain_query',
  'detect_anomaly',
  'describe_table',
] as const;

export type DbAgentToolName = (typeof DB_AGENT_TOOL_NAMES)[number];
export type DbAgentDialect = 'postgresql' | 'mysql' | 'sqlite';
export type AgentChartType = 'bar' | 'line' | 'pie' | 'scatter';

export interface AgentGenerateQueryInput {
  prompt: string;
  schema: string;
  dialect: DbAgentDialect;
}

export interface AgentGenerateQueryResult {
  sql: string;
  isMutation: boolean;
  explanation: string;
}

export interface AgentRenderTableInput {
  sql: string;
  limit?: number;
}

export interface AgentVisualizeTableInput {
  sql: string;
  chartType: AgentChartType;
}

export interface AgentTableColumn {
  name: string;
  type: string;
}

export interface AgentRenderTableResult {
  sql?: string;
  columns: AgentTableColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

export interface AgentVisualizePoint {
  label: string;
  x: string | number | null;
  y: number;
}

export interface AgentVisualizeTableResult {
  sql: string;
  chartType: AgentChartType;
  xField?: string;
  yField?: string;
  labelField?: string;
  points: AgentVisualizePoint[];
  rowCount: number;
  truncated: boolean;
}

export interface AgentExplainQueryInput {
  sql: string;
}

export interface AgentExplainQueryResult {
  rawPlan: string;
  summary: string;
  slowestNode: string;
  estimatedCost: number;
  suggestions: string[];
}

export type AgentAnomalyCheck =
  | 'nulls'
  | 'duplicates'
  | 'orphan_fk'
  | 'outliers';
export type AgentAnomalySeverity = 'high' | 'medium' | 'low';

export interface AgentDetectAnomalyInput {
  tableName: string;
  checks?: AgentAnomalyCheck[];
}

export interface AgentAnomalyIssue {
  type: AgentAnomalyCheck;
  severity: AgentAnomalySeverity;
  column?: string;
  description: string;
  fixSql?: string;
}

export interface AgentDetectAnomalyResult {
  issues: AgentAnomalyIssue[];
  scannedRows: number;
  cleanScore: number;
}

export interface AgentDescribeTableInput {
  tableName: string;
}

export interface AgentDescribeColumn {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNullable: boolean;
  referencesTable?: string;
  description?: string;
}

export interface AgentDescribeTableResult {
  tableName: string;
  summary: string;
  columns: AgentDescribeColumn[];
  relatedTables: string[];
}

export interface AgentToolInputMap {
  generate_query: AgentGenerateQueryInput;
  render_table: AgentRenderTableInput;
  visualize_table: AgentVisualizeTableInput;
  explain_query: AgentExplainQueryInput;
  detect_anomaly: AgentDetectAnomalyInput;
  describe_table: AgentDescribeTableInput;
}

export interface AgentToolResultMap {
  generate_query: AgentGenerateQueryResult;
  render_table: AgentRenderTableResult;
  visualize_table: AgentVisualizeTableResult;
  explain_query: AgentExplainQueryResult;
  detect_anomaly: AgentDetectAnomalyResult;
  describe_table: AgentDescribeTableResult;
}

export type DbAgentSchemaSnapshot = Schema;

export interface DbAgentRequestBody {
  provider: string;
  model: string;
  apiKey: string;
  messages: DbAgentMessage[];
  selectedCommandOptions?: AgentCommandOptionId[];
  systemPrompt?: string;
  dbConnectionString?: string;
  dbType?: 'postgres' | 'mysql';
  dialect?: DbAgentDialect;
  schemaSnapshot?: DbAgentSchemaSnapshot;
  schemaSnapshots?: DbAgentSchemaSnapshot[];
  sendReasoning?: boolean;
}

export type DbAgentUITools = {
  [K in DbAgentToolName]: UITool & {
    input: AgentToolInputMap[K];
    output: AgentToolResultMap[K];
  };
};

export type DbAgentMessage = UIMessage<unknown, never, DbAgentUITools>;

export interface AgentTextBlock {
  kind: 'text' | 'markdown';
  content: string;
  isStreaming?: boolean;
}

export interface AgentCodeBlock {
  kind: 'code';
  code: string;
  language: string;
  isStreaming?: boolean;
}

export interface AgentReasoningBlock {
  kind: 'reasoning';
  content: string;
  isStreaming: boolean;
}

export interface AgentLoadingBlock {
  kind: 'loading';
  toolName: DbAgentToolName;
  toolCallId: string;
  label: string;
}

export interface AgentErrorBlock {
  kind: 'error';
  message: string;
}

export interface AgentToolBlock<T extends DbAgentToolName = DbAgentToolName> {
  kind: 'tool';
  toolName: T;
  toolCallId: string;
  result: AgentToolResultMap[T];
}

export interface AgentApprovalBlock<
  T extends DbAgentToolName = DbAgentToolName,
> {
  kind: 'approval';
  toolName: T;
  toolCallId: string;
  input: AgentToolInputMap[T];
  approvalId: string;
}

export interface AgentSourceBlock {
  kind: 'source';
  sourceId: string;
  url?: string;
  title?: string;
  mediaType?: string;
  filename?: string;
}

export type AgentBlock =
  | AgentTextBlock
  | AgentCodeBlock
  | AgentReasoningBlock
  | AgentLoadingBlock
  | AgentErrorBlock
  | AgentToolBlock
  | AgentApprovalBlock
  | AgentSourceBlock;

export interface AgentRenderedMessage {
  id: string;
  role: DbAgentMessage['role'];
  blocks: AgentBlock[];
}

export interface AgentPresetItem {
  id: string;
  name: string;
  title: string;
  description: string;
  promptSuggestion?: string;
}

export interface AgentHistorySession {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  provider: string;
  model: string;
  showReasoning: boolean;
  messages: DbAgentMessage[];
  workspaceId?: string;
}
