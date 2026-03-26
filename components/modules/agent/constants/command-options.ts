export const AGENT_COMMAND_OPTIONS = [
  {
    id: 'generate-query',
    label: 'Generate Query',
    toolName: 'generate_query',
    category: 'SQL',
    description:
      'Turn a natural language request into SQL for the active schema.',
    insertText: 'Generate SQL for ',
    icon: 'hugeicons:ai-brain-03',
    promptHint:
      'The user wants help drafting SQL from natural language. Prefer generate_query first and keep the response focused on producing or refining SQL.',
  },
  {
    id: 'render-table',
    label: 'Render Table',
    toolName: 'render_table',
    category: 'Execution',
    description:
      'Run a read-only SQL query and show the result rows as a table.',
    insertText: 'Run this query and show the table result for ',
    icon: 'hugeicons:table-01',
    promptHint:
      'The user expects concrete table output. After generating or receiving read-only SQL, prefer render_table and summarize the returned rows briefly.',
  },
  {
    id: 'visualize-table',
    label: 'Visualize Table',
    toolName: 'visualize_table',
    category: 'Charts',
    description:
      'Build a bar, line, pie, or scatter chart from a read-only query.',
    insertText:
      'Visualize this data as a bar, line, pie, or scatter chart for ',
    icon: 'hugeicons:chart-line-data-01',
    promptHint:
      'The user wants a chart-oriented answer. Prefer visualize_table for read-only SQL, and ask for the chart type only if it is still missing.',
  },
  {
    id: 'describe-table',
    label: 'Describe Table',
    toolName: 'describe_table',
    category: 'Schema',
    description: 'Inspect columns, keys, relationships, and table structure.',
    insertText: 'Describe the structure of table ',
    icon: 'hugeicons:database',
    promptHint:
      'The user is asking about schema shape, keys, or relationships. Prefer describe_table when a specific table is involved.',
  },
  {
    id: 'explain-query',
    label: 'Explain Query',
    toolName: 'explain_query',
    category: 'Performance',
    description:
      'Analyze a query plan and explain possible performance issues.',
    insertText: 'Explain why this query is slow: ',
    icon: 'hugeicons:activity-02',
    promptHint:
      'The user is focused on query performance. Prefer explain_query once a concrete SQL statement is available.',
  },
  {
    id: 'detect-anomaly',
    label: 'Detect Anomaly',
    toolName: 'detect_anomaly',
    category: 'Quality',
    description:
      'Scan for nulls, duplicates, orphaned keys, and outlier values.',
    insertText: 'Detect anomalies in table ',
    icon: 'hugeicons:search-list-01',
    promptHint:
      'The user wants data quality checks. Prefer detect_anomaly for table-level validation and summarize the findings with severity.',
  },
] as const;

export type AgentCommandOption = (typeof AGENT_COMMAND_OPTIONS)[number];
export type AgentCommandOptionId = AgentCommandOption['id'];

export const getAgentCommandOptionsByIds = (
  ids: readonly AgentCommandOptionId[]
): AgentCommandOption[] => {
  const allowedIds = new Set(ids);

  return AGENT_COMMAND_OPTIONS.filter(option => allowedIds.has(option.id));
};
