import { describe, expect, it } from 'vitest';
import { AgentToolName } from '~/components/modules/agent/types';
import type { DbAgentSchemaSnapshot } from '~/components/modules/agent/types';
import type { DatabaseAdapter } from '~/server/infrastructure/agent/core/types';
import { resolveActiveTools } from '~/server/infrastructure/agent/tools';

const mockSnapshot: DbAgentSchemaSnapshot = {
  id: 'test',
  connectionId: 'conn-1',
  workspaceId: 'ws-1',
  name: 'public',
  tables: ['users'],
  views: [],
  functions: [],
  tableDetails: {},
};

const mockAdapter = {} as DatabaseAdapter;

describe('resolveActiveTools', () => {
  it('includes schema discovery tools when adapter + snapshots provided', () => {
    const tools = resolveActiveTools(mockAdapter, [mockSnapshot]);
    expect(tools).toContain(AgentToolName.ListSchemas);
    expect(tools).toContain(AgentToolName.GetTableSchema);
    expect(tools).toContain(AgentToolName.RenderErd);
  });

  it('includes schema tools even without adapter when snapshots exist', () => {
    const tools = resolveActiveTools(null, [mockSnapshot]);
    expect(tools).toContain(AgentToolName.ListSchemas);
    expect(tools).toContain(AgentToolName.GetTableSchema);
    expect(tools).toContain(AgentToolName.RenderErd);
  });

  it('excludes schema tools when no snapshots', () => {
    const tools = resolveActiveTools(mockAdapter, undefined);
    expect(tools).not.toContain(AgentToolName.ListSchemas);
    expect(tools).not.toContain(AgentToolName.GetTableSchema);
    expect(tools).not.toContain(AgentToolName.RenderErd);
    expect(tools).not.toContain(AgentToolName.DetectAnomaly);
    expect(tools).not.toContain(AgentToolName.DescribeTable);
  });

  it('always includes GenerateQuery and AskClarification', () => {
    const tools = resolveActiveTools(null, undefined);
    expect(tools).toContain(AgentToolName.GenerateQuery);
    expect(tools).toContain(AgentToolName.AskClarification);
  });

  it('includes execution tools only with adapter', () => {
    const withAdapter = resolveActiveTools(mockAdapter, [mockSnapshot]);
    expect(withAdapter).toContain(AgentToolName.RenderTable);
    expect(withAdapter).toContain(AgentToolName.VisualizeTable);
    expect(withAdapter).toContain(AgentToolName.ExplainQuery);

    const withoutAdapter = resolveActiveTools(null, [mockSnapshot]);
    expect(withoutAdapter).not.toContain(AgentToolName.RenderTable);
    expect(withoutAdapter).not.toContain(AgentToolName.VisualizeTable);
    expect(withoutAdapter).not.toContain(AgentToolName.ExplainQuery);
  });
});
