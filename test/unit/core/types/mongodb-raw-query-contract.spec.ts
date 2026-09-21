import { describe, expect, it } from 'vitest';
import { MONGO_RAW_QUERY_LIMITS } from '~/core/constants/mongodb-raw-query';
import { isMongoRawQueryStreamMessage } from '~/core/types/mongodb-raw-query.types';

describe('Mongo raw query shared contract', () => {
  it('publishes the approved default limits', () => {
    expect(MONGO_RAW_QUERY_LIMITS).toEqual({
      maxDocuments: 10_000,
      maxValueBytes: 20 * 1024 * 1024,
      maxScriptBytes: 1024 * 1024,
      maxParamsBytes: 2 * 1024 * 1024,
      maxOperations: 100,
      maxOperationSummaryChars: 2_000,
    });
  });

  it('accepts known NDJSON events and rejects unknown payloads', () => {
    expect(isMongoRawQueryStreamMessage({ type: 'rows', data: [] })).toBe(true);
    expect(isMongoRawQueryStreamMessage({ type: 'mystery' })).toBe(false);
  });
});
