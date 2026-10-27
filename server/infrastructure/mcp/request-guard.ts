import { getRequestHeader, type H3Event } from 'h3';

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const LOOPBACK_HOSTNAMES = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

function isLoopbackHostname(value: string | undefined, withProtocol: boolean) {
  if (!value) return true;

  try {
    const url = new URL(withProtocol ? value : `http://${value}`);
    return LOOPBACK_HOSTNAMES.has(url.hostname);
  } catch {
    return false;
  }
}

function getClientAddress(event: H3Event): string {
  const socketAddress = event.node.req.socket.remoteAddress;

  if (socketAddress) return socketAddress;

  // `nuxt dev` forwards requests to the Nitro worker over a local socket that
  // has no remote address; the dev proxy reports the real client instead.
  const forwardedFor = getRequestHeader(event, 'x-forwarded-for') ?? '';
  return forwardedFor.split(',')[0]?.trim() ?? '';
}

/**
 * Bearer tokens are not enough on their own: the endpoint must only ever
 * answer local clients. The client address must be loopback (dev server
 * binds 0.0.0.0), and the Host/Origin headers must be loopback too to block
 * DNS-rebinding from websites open in a browser.
 */
export function isLocalMcpRequest(event: H3Event): boolean {
  const remoteAddress = getClientAddress(event);

  return (
    LOOPBACK_ADDRESSES.has(remoteAddress) &&
    isLoopbackHostname(getRequestHeader(event, 'host'), false) &&
    isLoopbackHostname(getRequestHeader(event, 'origin'), true)
  );
}

export function getBearerToken(event: H3Event): string | null {
  const authorization = getRequestHeader(event, 'authorization') ?? '';
  const match = authorization.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}
