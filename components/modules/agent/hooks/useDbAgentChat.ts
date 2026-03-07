import { lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai';
import { EDatabaseType } from '~/components/modules/connection/constants';
import { useAiChat } from '~/core/composables/useAiChat';
import { useAppContext } from '~/core/contexts/useAppContext';
import type {
  DbAgentDialect,
  DbAgentMessage,
  DbAgentSchemaSnapshot,
} from '../types';

const buildAgentSystemPrompt = (
  schemaContext?: string
) => `You are HeraQ DB Editor Agent.

You help users explore schemas, reason about SQL, explain database structures, and suggest safe next steps for the current database.

Use tools whenever they can produce a structured result:
- \`generate_query\` for turning natural language into SQL
- \`render_table\` for executing SQL and showing structured rows
- \`describe_table\` for schema introspection
- \`explain_query\` for performance analysis
- \`detect_anomaly\` for data quality scans

Rules:
- Stay grounded in the provided schema context.
- Never invent tables or columns that are not present in the schema context.
- If schema context is incomplete, say what is missing before making assumptions.
- After generating a read-only query, prefer calling \`render_table\` so the user gets concrete results.
- For destructive or mutating SQL, explain the plan clearly and let the approval flow gate execution.
- Keep narration concise and let tool blocks carry the detailed output.

${
  schemaContext
    ? `Active schema context:\n${schemaContext}`
    : 'No schema context is currently loaded. Ask the user for the target schema or connection when needed.'
}
`;

const DIALECT_MAP: Record<EDatabaseType, DbAgentDialect> = {
  [EDatabaseType.PG]: 'postgresql',
  [EDatabaseType.MYSQL]: 'mysql',
};

const formatTableContext = (
  snapshot: DbAgentSchemaSnapshot | undefined,
  maxTables = 16,
  maxColumns = 10
) => {
  if (!snapshot) {
    return undefined;
  }

  const header = [
    `Schema: ${snapshot.schemaName}`,
    `Tables (${snapshot.tables.length}): ${snapshot.tables.join(', ')}`,
  ];

  const tableSummaries = snapshot.tables.slice(0, maxTables)?.map(tableName => {
    const detail = snapshot.tableDetails?.[tableName];

    if (!detail) {
      return `Table ${tableName}`;
    }

    const primaryKeys = new Set(detail.primary_keys.map(key => key.column));
    const foreignKeys = new Map(
      detail.foreign_keys.map(key => [key.column, key] as const)
    );

    const columns = detail.columns.slice(0, maxColumns).map(column => {
      const tags = [`${column.name} ${column.short_type_name || column.type}`];

      if (primaryKeys.has(column.name)) {
        tags.push('PK');
      }

      const foreignKey = foreignKeys.get(column.name);
      if (foreignKey) {
        tags.push(
          `FK->${foreignKey.referenced_table}.${foreignKey.referenced_column}`
        );
      }

      if (!column.is_nullable) {
        tags.push('NOT NULL');
      }

      return tags.join(' ');
    });

    const remainingColumns = detail.columns.length - columns.length;
    const suffix =
      remainingColumns > 0 ? `, ... (+${remainingColumns} more columns)` : '';

    return `Table ${tableName}: ${columns.join(', ')}${suffix}`;
  });

  if (snapshot.tables.length > maxTables) {
    tableSummaries.push(
      `Additional tables omitted: ${snapshot.tables.length - maxTables}`
    );
  }

  return [...header, ...tableSummaries].join('\n');
};

export function useAgentChat(sendReasoning?: Ref<boolean>) {
  const { schemaStore, connectionStore } = useAppContext();

  const schemaStats = computed(() => {
    const schema = schemaStore.activeSchema;
    const tables = schema?.tables || [];

    return {
      name: schema?.name ?? 'No schema',
      tableCount: tables.length,
      tables,
    };
  });

  const schemaSnapshot = computed<DbAgentSchemaSnapshot | undefined>(() => {
    const schema = schemaStore.activeSchema;

    if (!schema) {
      return undefined;
    }

    return {
      schemaName: schema.name,
      tables: schema.tables || [],
      tableDetails: schema.tableDetails ?? undefined,
    };
  });

  const dialect = computed<DbAgentDialect>(() => {
    const type = connectionStore.selectedConnection?.type;
    return type ? DIALECT_MAP[type] || 'postgresql' : 'postgresql';
  });

  const schemaContext = computed(() => {
    return formatTableContext(schemaSnapshot.value);
  });

  const chat = useAiChat<DbAgentMessage>({
    context: schemaContext,
    api: '/api/ai/agent',
    buildSystemPrompt: buildAgentSystemPrompt,
    body: () => ({
      dbConnectionString: connectionStore.selectedConnection?.connectionString,
      dialect: dialect.value,
      schemaName: schemaSnapshot.value?.schemaName,
      schemaContext: schemaContext.value,
      schemaSnapshot: schemaSnapshot.value,
      sendReasoning: sendReasoning?.value ?? true,
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });

  return {
    ...chat,
    dialect,
    schemaContext,
    schemaSnapshot,
    schemaStats,
  };
}
