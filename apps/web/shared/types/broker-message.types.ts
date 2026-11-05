/** How the raw payload bytes are carried over the wire to the client. */
export type BrokerPayloadTransport = 'text' | 'base64';

/**
 * A single message read from a broker (RabbitMQ queue peek or Kafka record),
 * normalized so the message table and detail panel can render both.
 */
export interface BrokerMessage {
  id: string;
  payload: string;
  payloadTransport: BrokerPayloadTransport;
  payloadBytes: number;
  isTruncated: boolean;
  headers: Record<string, string>;
  timestamp: string | null;
  /** Kafka only. */
  key?: string | null;
  partition?: number;
  offset?: string;
  /** RabbitMQ only. */
  exchange?: string;
  routingKey?: string;
  isRedelivered?: boolean;
  properties?: Record<string, unknown>;
}
