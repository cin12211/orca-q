/**
 * MCP session tokens. Uses Web Crypto so the renderer and the Nitro server
 * share one implementation.
 */
export const MCP_TOKEN_PREFIX = 'orcaq_';
const MCP_TOKEN_BYTES = 32;

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

/** Masked form shown until the user reveals the token, e.g. `orcaq_••••x9Qa`. */
export function maskMcpToken(token: string): string {
  return `${MCP_TOKEN_PREFIX}••••••••${token.slice(-4)}`;
}
