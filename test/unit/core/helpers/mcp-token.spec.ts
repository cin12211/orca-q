import { describe, expect, it } from 'vitest';
import {
  generateMcpToken,
  hashMcpToken,
  maskMcpToken,
  MCP_TOKEN_PREFIX,
} from '~/core/helpers/mcp-token';
import {
  McpConnectionAccess,
  normalizeMcpServerConfigs,
  resolveMcpConnectionAccess,
} from '~/core/persist/normalize';

describe('mcp-token', () => {
  it('generates unique prefixed tokens', () => {
    const first = generateMcpToken();
    expect(first.startsWith(MCP_TOKEN_PREFIX)).toBe(true);
    expect(first.length).toBeGreaterThan(40);
    expect(generateMcpToken()).not.toBe(first);
  });

  it('hashes tokens with SHA-256 hex', async () => {
    expect(await hashMcpToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });

  it('masks all but the last characters', () => {
    const masked = maskMcpToken('orcaq_secretvalueXYZW');
    expect(masked).toBe('orcaq_••••••••XYZW');
    expect(masked).not.toContain('secret');
  });
});

describe('MCP session access', () => {
  const session = {
    workspaceAccess: { 'ws-1': McpConnectionAccess.Read },
    connectionAccess: {
      'conn-a': McpConnectionAccess.Write,
      'conn-b': McpConnectionAccess.Off,
    },
  };

  it('prefers connection access, then workspace access, else off', () => {
    expect(
      resolveMcpConnectionAccess(session, { id: 'conn-a', workspaceId: 'ws-1' })
    ).toBe(McpConnectionAccess.Write);
    expect(
      resolveMcpConnectionAccess(session, { id: 'conn-b', workspaceId: 'ws-1' })
    ).toBe(McpConnectionAccess.Off);
    expect(
      resolveMcpConnectionAccess(session, { id: 'conn-c', workspaceId: 'ws-1' })
    ).toBe(McpConnectionAccess.Read);
    expect(
      resolveMcpConnectionAccess(session, { id: 'conn-d', workspaceId: 'ws-2' })
    ).toBe(McpConnectionAccess.Off);
  });

  it('drops malformed sessions and access values', () => {
    const configs = normalizeMcpServerConfigs({
      enabled: true,
      sessions: [
        { id: 's1', token: 't', workspaceAccess: { w: 'admin' } },
        { name: 'missing id' },
      ],
    });
    expect(configs.sessions).toHaveLength(1);
    expect(configs.sessions[0]?.workspaceAccess).toEqual({});
  });

  it('requires a token unless explicitly turned off', () => {
    const configs = normalizeMcpServerConfigs({
      sessions: [
        { id: 'a', token: 't1' },
        { id: 'b', token: 't2', requireToken: false },
      ],
    });
    expect(configs.sessions.map(session => session.requireToken)).toEqual([
      true,
      false,
    ]);
  });
});
