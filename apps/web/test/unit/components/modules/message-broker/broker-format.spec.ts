import { describe, expect, it } from 'vitest';
import {
  BROKER_HEADERS_FORMAT_ERROR,
  formatMessageRate,
  formatRatio,
  parseBrokerHeaders,
} from '~/components/modules/shared/message-broker/utils';

describe('parseBrokerHeaders', () => {
  it('treats an empty textarea as no headers', () => {
    expect(parseBrokerHeaders('  ')).toEqual({ headers: {} });
  });

  it('stringifies header values', () => {
    expect(parseBrokerHeaders('{"source":"orcaq","retry":2}')).toEqual({
      headers: { source: 'orcaq', retry: '2' },
    });
  });

  it('rejects invalid JSON, arrays and primitives', () => {
    for (const text of ['{oops', '[1,2]', '"text"', 'null']) {
      expect(parseBrokerHeaders(text)).toEqual({
        error: BROKER_HEADERS_FORMAT_ERROR,
      });
    }
  });
});

describe('broker number formatting', () => {
  it('formats message rates and shows a dash when unknown', () => {
    expect(formatMessageRate(2.345)).toBe('2.3/s');
    expect(formatMessageRate(null)).toBe('-');
    expect(formatMessageRate(undefined)).toBe('-');
  });

  it('formats ratios as whole percentages', () => {
    expect(formatRatio(0.456)).toBe('46%');
    expect(formatRatio(1)).toBe('100%');
    expect(formatRatio(null)).toBe('-');
  });
});
