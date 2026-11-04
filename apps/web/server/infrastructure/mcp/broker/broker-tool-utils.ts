import { z } from 'zod';
import type { DatabaseClientType } from '~/core/constants/database-client-type';
import type { BrokerMessage } from '~/core/types/broker-message.types';
import type { Connection } from '~/core/types/entities/connection.entity';
import type { BrokerConnectionInput } from '~/server/infrastructure/nosql/broker/broker-connection';
import { getMcpConnection } from '../desktop-store';

export const MCP_DEFAULT_MESSAGE_COUNT = 20;
/** Long payloads would flood the agent's context; the UI shows them in full. */
export const MCP_MAX_PAYLOAD_CHARS = 2_000;

export const brokerConnectionIdSchema = z
  .string()
  .describe('Connection id from list_connections.');

/** Resolve a connection the session can see and check it is of `type`. */
export async function getBrokerConnection(
  sessionId: string,
  connectionId: string,
  type: DatabaseClientType,
  label: string
): Promise<BrokerConnectionInput> {
  const { connection } = await getMcpConnection(sessionId, connectionId);

  if (connection.type !== type) {
    throw new Error(
      `Connection "${connection.name}" is ${connection.type}, not ${label}. Use the tools that match its family from list_connections.`
    );
  }

  return toBrokerInput(connection);
}

export function toBrokerInput(connection: Connection): BrokerConnectionInput {
  return {
    method: connection.method,
    host: connection.host,
    port: connection.port,
    username: connection.username,
    password: connection.password,
    ssl: connection.ssl,
    ssh: connection.ssh,
    broker: connection.broker,
  };
}

export function clampMessageCount(count: number | undefined, max: number) {
  if (!count || !Number.isFinite(count)) return MCP_DEFAULT_MESSAGE_COUNT;
  return Math.max(1, Math.min(Math.floor(count), max));
}

export function toMcpMessage(message: BrokerMessage) {
  const isCut = message.payload.length > MCP_MAX_PAYLOAD_CHARS;

  return {
    ...message,
    payload: isCut
      ? `${message.payload.slice(0, MCP_MAX_PAYLOAD_CHARS)}… (${message.payload.length} chars)`
      : message.payload,
    isTruncated: message.isTruncated || isCut,
  };
}
