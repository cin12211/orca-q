import { describe, expect, it } from 'vitest';
import type { DbAgentSchemaSnapshot } from '~/components/modules/agent/types';
import { buildAgentSystemPrompt } from '~/server/infrastructure/agent/systemPromt';

const mockSnapshot: DbAgentSchemaSnapshot = {
  id: 'test',
  connectionId: 'conn-1',
  workspaceId: 'ws-1',
  name: 'public',
  tables: ['users', 'orders'],
  views: [],
  functions: [],
  tableDetails: {},
};

describe('buildAgentSystemPrompt', () => {
  it('includes schema summary instead of full schema dump', () => {
    const prompt = buildAgentSystemPrompt([mockSnapshot]);
    // Should include summary
    expect(prompt).toContain('1 schema(s)');
    expect(prompt).toContain('"public"');
    expect(prompt).toContain('2 tables');
    // Should reference schema tools
    expect(prompt).toContain('list_schemas');
    expect(prompt).toContain('get_table_schema');
  });

  it('includes new tools in available tools section', () => {
    const prompt = buildAgentSystemPrompt([mockSnapshot]);
    expect(prompt).toContain('`list_schemas`');
    expect(prompt).toContain('`get_table_schema`');
    expect(prompt).toContain('`render_erd`');
  });

  it('does not include column-level details in system prompt', () => {
    const snapshotWithDetails: DbAgentSchemaSnapshot = {
      ...mockSnapshot,
      tableDetails: {
        users: {
          table_id: 'users',
          columns: [
            {
              name: 'email',
              ordinal_position: 1,
              type: 'varchar',
              short_type_name: 'varchar',
              is_nullable: false,
              default_value: null,
            },
          ],
          primary_keys: [],
          foreign_keys: [],
        },
      },
    };
    const prompt = buildAgentSystemPrompt([snapshotWithDetails]);
    // Full schema context would include column details
    expect(prompt).not.toContain('varchar');
    expect(prompt).not.toContain('email');
  });

  it('does not include selectedCommandOptions section', () => {
    const prompt = buildAgentSystemPrompt([mockSnapshot]);
    expect(prompt).not.toContain('Current user intent focus');
    expect(prompt).not.toContain('promptHint');
  });

  it('handles no schema snapshots gracefully', () => {
    const prompt = buildAgentSystemPrompt(undefined);
    expect(prompt).toContain('No schema context');
  });
});
