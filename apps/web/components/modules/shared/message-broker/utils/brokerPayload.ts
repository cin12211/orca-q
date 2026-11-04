import type { BrokerMessage } from '~/core/types/broker-message.types';

export type BrokerPayloadKind = 'json' | 'text' | 'binary' | 'empty';

export interface DecodedBrokerPayload {
  kind: BrokerPayloadKind;
  /** Pretty text for display (formatted JSON, raw text, or hex dump). */
  text: string;
  json?: unknown;
}

const HEX_PREVIEW_BYTES = 4096;

const base64ToHex = (value: string) => {
  const binary = atob(value);
  const bytes: string[] = [];

  for (
    let index = 0;
    index < Math.min(binary.length, HEX_PREVIEW_BYTES);
    index++
  ) {
    bytes.push(binary.charCodeAt(index).toString(16).padStart(2, '0'));
  }

  const suffix = binary.length > HEX_PREVIEW_BYTES ? ' …' : '';
  return `${bytes.join(' ')}${suffix}`;
};

/** Decide how to show a payload: JSON first, then text, else hex bytes. */
export function decodeBrokerPayload(
  message: Pick<BrokerMessage, 'payload' | 'payloadTransport'>
): DecodedBrokerPayload {
  if (message.payloadTransport === 'base64') {
    return { kind: 'binary', text: base64ToHex(message.payload) };
  }

  if (!message.payload) {
    return { kind: 'empty', text: '' };
  }

  const trimmed = message.payload.trim();

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const json = JSON.parse(trimmed);
      return { kind: 'json', text: JSON.stringify(json, null, 2), json };
    } catch {
      // Not JSON after all, fall through to plain text.
    }
  }

  return { kind: 'text', text: message.payload };
}

export function previewBrokerPayload(
  message: Pick<BrokerMessage, 'payload' | 'payloadTransport'>,
  maxLength = 160
) {
  const decoded = decodeBrokerPayload(message);
  const singleLine =
    decoded.kind === 'json'
      ? JSON.stringify(decoded.json)
      : decoded.text.replace(/\s+/g, ' ');

  return singleLine.length > maxLength
    ? `${singleLine.slice(0, maxLength)}…`
    : singleLine;
}
