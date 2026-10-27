import { normalizeMcpSession, type McpSession } from '~/core/persist/normalize';
import { IDBStorage } from '../base/IDBStorage';
import { MCP_SESSION_IDB } from '../idbRegistry';

/** Web fallback only; the MCP server itself runs in the desktop app. */
class McpSessionStorage extends IDBStorage<McpSession> {
  readonly name = 'mcpSession';

  constructor() {
    super(MCP_SESSION_IDB);
  }

  async getAll(): Promise<McpSession[]> {
    return (await this.getMany()).flatMap(session => {
      const normalized = normalizeMcpSession(session);
      return normalized ? [normalized] : [];
    });
  }
}

export const mcpSessionStorage = new McpSessionStorage();
