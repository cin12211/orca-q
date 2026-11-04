import type { H3Event } from 'h3';
import { describe, expect, it } from 'vitest';
import { isLocalMcpRequest } from '~/server/infrastructure/mcp';

function createEvent(
  remoteAddress: string | undefined,
  headers: Record<string, string>
): H3Event {
  return {
    node: { req: { socket: { remoteAddress }, headers } },
  } as unknown as H3Event;
}

describe('isLocalMcpRequest', () => {
  it('accepts loopback clients without an Origin header', () => {
    expect(
      isLocalMcpRequest(createEvent('127.0.0.1', { host: '127.0.0.1:29092' }))
    ).toBe(true);
    expect(
      isLocalMcpRequest(createEvent('::1', { host: 'localhost:3000' }))
    ).toBe(true);
  });

  it('rejects requests from other machines', () => {
    expect(
      isLocalMcpRequest(
        createEvent('192.168.1.20', { host: '192.168.1.5:3000' })
      )
    ).toBe(false);
  });

  it('uses the dev proxy forwarded address when the socket has none', () => {
    expect(
      isLocalMcpRequest(
        createEvent(undefined, {
          host: '127.0.0.1:3000',
          'x-forwarded-for': '127.0.0.1',
        })
      )
    ).toBe(true);
    expect(
      isLocalMcpRequest(
        createEvent(undefined, {
          host: '127.0.0.1:3000',
          'x-forwarded-for': '192.168.1.20',
        })
      )
    ).toBe(false);
  });

  it('rejects DNS-rebinding hosts and foreign origins', () => {
    expect(
      isLocalMcpRequest(
        createEvent('127.0.0.1', { host: 'evil.example:29092' })
      )
    ).toBe(false);
    expect(
      isLocalMcpRequest(
        createEvent('127.0.0.1', {
          host: '127.0.0.1:29092',
          origin: 'https://evil.example',
        })
      )
    ).toBe(false);
  });
});
