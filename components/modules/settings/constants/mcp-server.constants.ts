import { McpConnectionAccess } from '~/core/persist/store-state';

export const MCP_ENDPOINT_PATH = '/mcp';
export const MCP_SERVER_NAME = 'orcaq';

export const MCP_CONNECTION_ACCESS_OPTIONS: Array<{
  label: string;
  value: McpConnectionAccess;
}> = [
  { label: 'Off', value: McpConnectionAccess.Off },
  { label: 'Read only', value: McpConnectionAccess.Read },
  { label: 'Read & write', value: McpConnectionAccess.Write },
];
