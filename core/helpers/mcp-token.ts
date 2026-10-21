/**
 * MCP session tokens. Uses Web Crypto so the renderer (token creation) and
 * the Nitro server (token check) share one implementation.
 */
export const MCP_TOKEN_PREFIX = 'orcaq_';
const MCP_TOKEN_BYTES = 32;
const MCP_TOKEN_PREVIEW_LENGTH = 4;

const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

export function generateMcpToken(): string {
  const bytes = globalThis.crypto.getRandomValues(
    new Uint8Array(MCP_TOKEN_BYTES)
  );
  return `${MCP_TOKEN_PREFIX}${toBase64Url(bytes)}`;
}

export async function hashMcpToken(token: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token)
  );

  return Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

/** Short, non-secret hint shown in the session list, e.g. `orcaq_…x9Qa`. */
export function getMcpTokenPreview(token: string): string {
  return `${MCP_TOKEN_PREFIX}…${token.slice(-MCP_TOKEN_PREVIEW_LENGTH)}`;
}
