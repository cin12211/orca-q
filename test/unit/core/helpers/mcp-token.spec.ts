import { describe, expect, it } from 'vitest';
import {
  generateMcpToken,
  getMcpTokenPreview,
  hashMcpToken,
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

  it('builds a short preview without leaking the token', () => {
    expect(getMcpTokenPreview('orcaq_secretvalueXYZW')).toBe('orcaq_…XYZW');
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
        { id: 's1', tokenHash: 'h', workspaceAccess: { w: 'admin' } },
        { name: 'missing id' },
      ],
    });
    expect(configs.sessions).toHaveLength(1);
    expect(configs.sessions[0]?.workspaceAccess).toEqual({});
  });
});
