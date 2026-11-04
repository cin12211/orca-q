import type { DatabaseClientType } from '~/core/constants/database-client-type';
import { McpConnectionAccess } from '~/core/persist/store-state';

export const MCP_ENDPOINT_PATH = '/mcp';
export const MCP_SERVER_NAME = 'orcaq';
/** Select value meaning "use the workspace access" for a single connection. */
export const MCP_INHERIT_ACCESS = 'inherit';

export const MCP_CONNECTION_ACCESS_OPTIONS: Array<{
  label: string;
  value: McpConnectionAccess;
}> = [
  { label: 'No access', value: McpConnectionAccess.Off },
  { label: 'Read only', value: McpConnectionAccess.Read },
  { label: 'Read & write', value: McpConnectionAccess.Write },
];

export const MCP_ACCESS_LABELS: Record<McpConnectionAccess, string> = {
  [McpConnectionAccess.Off]: 'No access',
  [McpConnectionAccess.Read]: 'Read only',
  [McpConnectionAccess.Write]: 'Read & write',
};

export interface McpWorkspaceOption {
  id: string;
  name: string;
  icon: string;
  connections: Array<{ id: string; name: string; type: DatabaseClientType }>;
}

export interface McpClientSnippet {
  name: string;
  code: string;
}

/** Pass `token: null` for sessions that do not require an auth token. */
export function buildMcpClientSnippets(
  endpointUrl: string,
  token: string | null
): McpClientSnippet[] {
  if (token === null) {
    return [
      {
        name: 'Claude Code',
        code: `claude mcp add --transport http ${MCP_SERVER_NAME} ${endpointUrl}`,
      },
      {
        name: 'Codex (~/.codex/config.toml)',
        code: `[mcp_servers.${MCP_SERVER_NAME}]\nurl = "${endpointUrl}"`,
      },
      {
        name: 'Claude Desktop / Cursor (JSON)',
        code: JSON.stringify(
          {
            mcpServers: {
              [MCP_SERVER_NAME]: {
                command: 'npx',
                args: ['-y', 'mcp-remote', endpointUrl],
              },
            },
          },
          null,
          2
        ),
      },
    ];
  }

  return [
    {
      name: 'Claude Code',
      code: `claude mcp add --transport http ${MCP_SERVER_NAME} ${endpointUrl} --header "Authorization: Bearer ${token}"`,
    },
    {
      name: 'Codex (~/.codex/config.toml)',
      code: `[mcp_servers.${MCP_SERVER_NAME}]\nurl = "${endpointUrl}"\nhttp_headers = { Authorization = "Bearer ${token}" }`,
    },
    {
      name: 'Claude Desktop / Cursor (JSON)',
      code: JSON.stringify(
        {
          mcpServers: {
            [MCP_SERVER_NAME]: {
              command: 'npx',
              args: [
                '-y',
                'mcp-remote',
                endpointUrl,
                '--header',
                `Authorization:Bearer ${token}`,
              ],
            },
          },
        },
        null,
        2
      ),
    },
  ];
}
