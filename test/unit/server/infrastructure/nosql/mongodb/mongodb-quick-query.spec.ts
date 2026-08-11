import { describe, expect, it } from 'vitest';
import {
  buildMongoDocumentSelector,
  normalizeMongoFilter,
} from '~/server/infrastructure/nosql/mongodb/mongodb-quick-query';

describe('MongoDB Quick Query request helpers', () => {
  it('converts a valid _id string in a filter into an ObjectId', () => {
    const filter = normalizeMongoFilter({
      _id: '507f1f77bcf86cd799439011',
      status: 'active',
    });

    expect(filter.status).toBe('active');
    expect(filter._id?.toHexString()).toBe('507f1f77bcf86cd799439011');
  });

  it('rejects Mongo operators outside the Quick Query allowlist', () => {
    expect(() => normalizeMongoFilter({ $where: 'sleep(1)' })).toThrow(
      'Unsupported MongoDB filter operator: $where'
    );
  });

  it('creates a mutation selector only from a valid document id', () => {
    expect(
      buildMongoDocumentSelector('507f1f77bcf86cd799439011')._id.toHexString()
    ).toBe('507f1f77bcf86cd799439011');
    expect(() => buildMongoDocumentSelector('not-an-object-id')).toThrow(
      'Invalid MongoDB document _id'
    );
  });
});
