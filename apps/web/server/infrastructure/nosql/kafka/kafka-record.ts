import type { RecordsBatch } from '@platformatic/kafka';
import type { BrokerMessage } from '~/core/types/broker-message.types';

export const KAFKA_PAYLOAD_TRUNCATE_BYTES = 256 * 1024;

const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

/** Text when the bytes are valid UTF-8, otherwise base64 so nothing is lost. */
function encodeBytes(buffer: Buffer) {
  const isTruncated = buffer.length > KAFKA_PAYLOAD_TRUNCATE_BYTES;
  const slice = isTruncated
    ? buffer.subarray(0, KAFKA_PAYLOAD_TRUNCATE_BYTES)
    : buffer;

  try {
    return {
      payload: utf8Decoder.decode(slice),
      payloadTransport: 'text' as const,
      isTruncated,
    };
  } catch {
    return {
      payload: slice.toString('base64'),
      payloadTransport: 'base64' as const,
      isTruncated,
    };
  }
}

const bufferToText = (value: Buffer | null) => {
  if (!value) return null;
  const encoded = encodeBytes(value);
  return encoded.payloadTransport === 'text'
    ? encoded.payload
    : `base64:${encoded.payload}`;
};

export interface DecodedKafkaRecord {
  offset: bigint;
  message: BrokerMessage;
}

/** Flatten fetched batches into messages at or after `fromOffset`. */
export function decodeRecordBatches(
  batches: RecordsBatch[] | null | undefined,
  context: { topic: string; partition: number; fromOffset: bigint }
): DecodedKafkaRecord[] {
  const decoded: DecodedKafkaRecord[] = [];

  for (const batch of batches ?? []) {
    for (const record of batch.records) {
      const offset = batch.firstOffset + BigInt(record.offsetDelta);
      // A fetch returns whole batches, which can start before the offset asked for.
      if (offset < context.fromOffset) continue;

      const value = record.value ?? Buffer.alloc(0);
      const encoded = encodeBytes(value);
      const timestamp = batch.firstTimestamp + record.timestampDelta;
      const headers: Record<string, string> = {};

      for (const [key, headerValue] of record.headers) {
        headers[key?.toString('utf8') ?? ''] = bufferToText(headerValue) ?? '';
      }

      decoded.push({
        offset,
        message: {
          id: `${context.partition}:${offset}`,
          ...encoded,
          payloadBytes: value.length,
          headers,
          timestamp:
            timestamp > 0n ? new Date(Number(timestamp)).toISOString() : null,
          key: bufferToText(record.key),
          partition: context.partition,
          offset: offset.toString(),
        },
      });
    }
  }

  return decoded;
}
