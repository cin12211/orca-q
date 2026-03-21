import type {
  AssistantModelMessage,
  ModelMessage,
  SystemModelMessage,
  ToolModelMessage,
  ToolUIPart,
  UIMessage,
  UITool,
  UserModelMessage,
} from 'ai';
import type { DatabaseClientType } from '~/core/constants';
import type { Schema } from '~/core/stores';

// ─── Shared tool name enum (FE + BE) ─────────────────────────────────────────
export const AgentToolName = {
  GenerateQuery: 'generate_query',
  RenderTable: 'render_table',
  VisualizeTable: 'visualize_table',
  ExplainQuery: 'explain_query',
  DetectAnomaly: 'detect_anomaly',
  DescribeTable: 'describe_table',
  /** Re-executes SQL on the server and exports rows — no row data in context window */
  ExportQueryResult: 'export_query_result',
  /** Exports free-form text (notes, scripts, docs) directly to a file */
  ExportContent: 'export_content',
  /** Lists available schemas with table names (lightweight) */
  ListSchemas: 'list_schemas',
  /** Returns detailed column/key info for a specific table */
  GetTableSchema: 'get_table_schema',
  /** Renders an ERD diagram for selected tables */
  RenderErd: 'render_erd',
  AskClarification: 'askClarification',
} as const;
export type AgentToolName = (typeof AgentToolName)[keyof typeof AgentToolName];

// DB-rendering tools (excludes askClarification — not a renderable tool block)
export const DB_AGENT_TOOL_NAMES = [
  AgentToolName.GenerateQuery,
  AgentToolName.RenderTable,
  AgentToolName.VisualizeTable,
  AgentToolName.ExplainQuery,
  AgentToolName.DetectAnomaly,
  AgentToolName.DescribeTable,
  AgentToolName.ExportQueryResult,
  AgentToolName.ExportContent,
  AgentToolName.ListSchemas,
  AgentToolName.GetTableSchema,
  AgentToolName.RenderErd,
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
  loading?: boolean;
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
  loading?: boolean;
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

export type AgentExportFormat =
  | 'csv'
  | 'json'
  | 'sql'
  | 'markdown'
  | 'txt'
  | 'tsv'
  | 'xml'
  | 'yaml'
  | 'html';

export interface AgentExportQueryResultInput {
  sql: string;
  format: AgentExportFormat;
  filename?: string;
  limit?: number;
}

export interface AgentExportContentInput {
  content: string;
  format: AgentExportFormat;
  filename?: string;
}

export interface AgentExportFilePreview {
  columns: string[];
  rows: Record<string, unknown>[];
  truncated: boolean;
}

export interface AgentExportFileResult {
  filename: string;
  mimeType: string;
  content: string;
  format: AgentExportFormat;
  encoding: 'utf8' | 'base64';
  fileSize: number;
  preview: AgentExportFilePreview;
  error?: string;
}

// ─── List schemas tool types ──────────────────────────────────────────────────
export interface AgentListSchemasInput {
  // no input needed
}

export interface AgentListSchemasResult {
  schemas: Array<{
    schemaName: string;
    tables: string[];
    views: string[];
    functions: string[];
  }>;
}

// ─── Get table schema tool types ──────────────────────────────────────────────
export interface AgentGetTableSchemaInput {
  schemaName: string;
  tableName: string;
}

export interface AgentGetTableSchemaResult {
  schemaName: string;
  tableName: string;
  columns: Array<{
    name: string;
    type: string;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    isNullable: boolean;
  }>;
  primaryKeys: string[];
  foreignKeys: Array<{
    column: string;
    referencedSchema: string;
    referencedTable: string;
    referencedColumn: string;
  }>;
}

// ─── ERD tool types ───────────────────────────────────────────────────────────
export interface AgentRenderErdInput {
  tableNames: string[];
  schemaName: string;
}

export interface AgentErdNode {
  id: string;
  tableName: string;
  schemaName: string;
  columns: Array<{
    name: string;
    type: string;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
  }>;
}

export interface AgentErdEdge {
  id: string;
  source: string;
  target: string;
  sourceColumn: string;
  targetColumn: string;
}

export interface AgentRenderErdResult {
  nodes: AgentErdNode[];
  edges: AgentErdEdge[];
}

export interface AgentToolInputMap {
  generate_query: AgentGenerateQueryInput;
  render_table: AgentRenderTableInput;
  visualize_table: AgentVisualizeTableInput;
  explain_query: AgentExplainQueryInput;
  detect_anomaly: AgentDetectAnomalyInput;
  describe_table: AgentDescribeTableInput;
  export_query_result: AgentExportQueryResultInput;
  export_content: AgentExportContentInput;
  list_schemas: AgentListSchemasInput;
  get_table_schema: AgentGetTableSchemaInput;
  render_erd: AgentRenderErdInput;
}

export interface AgentToolResultMap {
  generate_query: AgentGenerateQueryResult;
  render_table: AgentRenderTableResult;
  visualize_table: AgentVisualizeTableResult;
  explain_query: AgentExplainQueryResult;
  detect_anomaly: AgentDetectAnomalyResult;
  describe_table: AgentDescribeTableResult;
  export_query_result: AgentExportFileResult;
  export_content: AgentExportFileResult;
  list_schemas: AgentListSchemasResult;
  get_table_schema: AgentGetTableSchemaResult;
  render_erd: AgentRenderErdResult;
}

export type DbAgentSchemaSnapshot = Schema;

export interface DbAgentRequestBody {
  provider: string;
  model: string;
  apiKey: string;
  messages: DbAgentMessage[];
  systemPrompt?: string;
  dbConnectionString?: string;
  dbType?: DatabaseClientType;
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

export interface DbAgentModelMessageMap {
  system: SystemModelMessage;
  user: UserModelMessage;
  assistant: AssistantModelMessage;
  tool: ToolModelMessage;
}

export type DbAgentModelMessageRole = keyof DbAgentModelMessageMap;
export type DbAgentModelMessage = ModelMessage;
export type DbAgentModelMessageByRole<T extends DbAgentModelMessageRole> =
  DbAgentModelMessageMap[T];

export type DbAgentMessage = UIMessage<unknown, never, DbAgentUITools>;
export type DbAgentMessagePart = NonNullable<DbAgentMessage['parts']>[number];
export type DbAgentToolUIPart = ToolUIPart<DbAgentUITools>;

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

export interface AgentMermaidBlock {
  kind: 'mermaid';
  code: string;
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

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'single' | 'multiple' | 'open';
  suggestions: string[];
  required: boolean;
}

export interface AgentQuizBlock {
  kind: 'quiz';
  toolCallId: string;
  context: string;
  questions: QuizQuestion[];
}

export type AgentBlock =
  | AgentTextBlock
  | AgentCodeBlock
  | AgentMermaidBlock
  | AgentReasoningBlock
  | AgentLoadingBlock
  | AgentErrorBlock
  | AgentToolBlock
  | AgentApprovalBlock
  | AgentSourceBlock
  | AgentQuizBlock;

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
