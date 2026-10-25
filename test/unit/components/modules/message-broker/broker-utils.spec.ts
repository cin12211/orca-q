import { describe, expect, it } from 'vitest';
import { parseBrokerList } from '~/components/modules/connection/utils';
import {
  decodeBrokerPayload,
  estimateDrainSeconds,
  formatSeconds,
  previewBrokerPayload,
} from '~/components/modules/message-broker/utils';

describe('decodeBrokerPayload', () => {
  it('pretty-prints JSON payloads', () => {
    const decoded = decodeBrokerPayload({
      payload: '{"a":1}',
      payloadTransport: 'text',
    });

    expect(decoded.kind).toBe('json');
    expect(decoded.text).toBe('{\n  "a": 1\n}');
  });

  it('keeps invalid JSON as text and shows binary as hex', () => {
    expect(
      decodeBrokerPayload({ payload: '{oops', payloadTransport: 'text' }).kind
    ).toBe('text');
    expect(
      decodeBrokerPayload({ payload: 'AAH6', payloadTransport: 'base64' }).text
    ).toBe('00 01 fa');
  });

  it('builds a one-line preview', () => {
    expect(
      previewBrokerPayload({
        payload: '{\n "a": 1\n}',
        payloadTransport: 'text',
      })
    ).toBe('{"a":1}');
  });
});

describe('estimateDrainSeconds', () => {
  it('returns null when the backlog is not shrinking', () => {
    expect(
      estimateDrainSeconds({ backlog: 100, deliverRate: 5, publishRate: 10 })
    ).toBeNull();
  });

  it('divides the backlog by the net drain rate', () => {
    expect(
      estimateDrainSeconds({ backlog: 100, deliverRate: 15, publishRate: 5 })
    ).toBe(10);
    expect(formatSeconds(3700)).toBe('1h 1m');
  });
});

describe('parseBrokerList', () => {
  it('splits commas, spaces and new lines', () => {
    expect(parseBrokerList('a:9092, b:9092\nc:9092 ')).toEqual([
      'a:9092',
      'b:9092',
      'c:9092',
    ]);
  });
});
