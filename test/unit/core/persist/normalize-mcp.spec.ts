import { describe, expect, it } from 'vitest';
import {
  createDefaultAppConfigState,
  McpConnectionAccess,
  normalizeAppConfigState,
} from '~/core/persist/normalize';

describe('normalizeAppConfigState: MCP server settings', () => {
  it('keeps MCP sessions through a save/load round trip', () => {
    const saved = normalizeAppConfigState({
      ...createDefaultAppConfigState(),
      mcpServerConfigs: {
        enabled: true,
        sessions: [
          {
            id: 'session-1',
            name: 'Claude Code',
            token: 'orcaq_token',
            requireToken: false,
            createdAt: '2026-10-21T00:00:00.000Z',
            workspaceAccess: { 'ws-1': McpConnectionAccess.Read },
            connectionAccess: { 'conn-1': McpConnectionAccess.Write },
          },
        ],
      },
    });

    // Electron persists the config as JSON text in SQLite.
    const loaded = normalizeAppConfigState(JSON.parse(JSON.stringify(saved)));

    expect(loaded.mcpServerConfigs).toEqual(saved.mcpServerConfigs);
    expect(loaded.mcpServerConfigs.sessions[0]?.token).toBe('orcaq_token');
  });

  it('defaults to a disabled server with no sessions', () => {
    expect(normalizeAppConfigState({}).mcpServerConfigs).toEqual({
      enabled: false,
      sessions: [],
    });
  });
});
