import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {
  createError,
  defineEventHandler,
  sendWebResponse,
  setResponseHeader,
  toWebRequest,
} from 'h3';
import {
  createOrcaqMcpServer,
  findMcpSessionByToken,
  findTokenlessMcpSession,
  getBearerToken,
  getDesktopPersistDbPath,
  getMcpServerConfigs,
  isLocalMcpRequest,
  listMcpSessions,
} from '~/server/infrastructure/mcp';

/**
 * Built-in MCP endpoint (Streamable HTTP, stateless) served on the same port
 * as the desktop app, e.g. http://127.0.0.1:29092/mcp.
 */
export default defineEventHandler(async event => {
  if (!getDesktopPersistDbPath()) {
    throw createError({
      statusCode: 404,
      statusMessage:
        'The MCP server is only available in the OrcaQ desktop app.',
    });
  }

  if (!isLocalMcpRequest(event)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'The OrcaQ MCP server only accepts local requests.',
    });
  }

  const configs = await getMcpServerConfigs();

  if (!configs.enabled) {
    throw createError({
      statusCode: 503,
      statusMessage:
        'The OrcaQ MCP server is turned off. Enable it in OrcaQ Settings → MCP Server.',
    });
  }

  const sessions = await listMcpSessions();
  const token = getBearerToken(event);
  const session = token
    ? await findMcpSessionByToken(sessions, token)
    : findTokenlessMcpSession(sessions);

  if (!session) {
    setResponseHeader(event, 'WWW-Authenticate', 'Bearer realm="orcaq"');
    throw createError({
      statusCode: 401,
      statusMessage:
        'Missing or invalid bearer token. Create an MCP session in OrcaQ Settings → MCP Server and send its token as "Authorization: Bearer <token>", or turn off "Require auth token" for that session.',
    });
  }

  const server = createOrcaqMcpServer(session);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    const response = await transport.handleRequest(toWebRequest(event));
    await sendWebResponse(event, response);
  } finally {
    await transport.close();
    await server.close();
  }
});
