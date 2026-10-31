import { describe, expect, it } from 'vitest';
import type { BrokerMessage } from '~/core/types/broker-message.types';
import { EConnectionMethod } from '~/core/types/entities/connection.entity';
import type { Connection } from '~/core/types/entities/connection.entity';
import {
  clampMessageCount,
  MCP_DEFAULT_MESSAGE_COUNT,
  MCP_MAX_PAYLOAD_CHARS,
  toBrokerInput,
  toMcpMessage,
} from '~/server/infrastructure/mcp/broker/broker-tool-utils';

function message(payload: string): BrokerMessage {
  return {
    id: '1',
    payload,
    payloadTransport: 'text',
    payloadBytes: payload.length,
    isTruncated: false,
    headers: {},
    timestamp: null,
  } as BrokerMessage;
}

describe('MCP broker tool utils', () => {
  it('clamps the message count', () => {
    expect(clampMessageCount(undefined, 50)).toBe(MCP_DEFAULT_MESSAGE_COUNT);
    expect(clampMessageCount(0, 50)).toBe(MCP_DEFAULT_MESSAGE_COUNT);
    expect(clampMessageCount(7.8, 50)).toBe(7);
    expect(clampMessageCount(500, 50)).toBe(50);
  });

  it('keeps short payloads and cuts long ones', () => {
    expect(toMcpMessage(message('hello'))).toMatchObject({
      payload: 'hello',
      isTruncated: false,
    });

    const long = toMcpMessage(message('x'.repeat(MCP_MAX_PAYLOAD_CHARS + 10)));
    expect(long.isTruncated).toBe(true);
    expect(long.payload).toContain(`(${MCP_MAX_PAYLOAD_CHARS + 10} chars)`);
    expect(long.payload.startsWith('x'.repeat(MCP_MAX_PAYLOAD_CHARS))).toBe(
      true
    );
  });

  it('passes only broker fields of a saved connection', () => {
    const input = toBrokerInput({
      id: 'c1',
      workspaceId: 'ws',
      name: 'Rabbit',
      type: 'rabbitmq',
      method: EConnectionMethod.FORM,
      host: 'localhost',
      port: '15672',
      username: 'guest',
      password: 'guest',
      broker: { rabbitmq: { vhost: '/' } },
      createdAt: '2026-10-29',
    } as Connection);

    expect(input).toEqual({
      method: EConnectionMethod.FORM,
      host: 'localhost',
      port: '15672',
      username: 'guest',
      password: 'guest',
      ssl: undefined,
      ssh: undefined,
      broker: { rabbitmq: { vhost: '/' } },
    });
  });
});
