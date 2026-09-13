import { BSON } from 'mongodb';
import { describe, expect, it } from 'vitest';
import {
  serializeMongoRawQueryLogArgument,
  serializeMongoRawQueryValue,
} from '~/server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query.service';

describe('Mongo raw query service serialization', () => {
  it('serializes BSON values as Canonical EJSON', () => {
    expect(
      serializeMongoRawQueryValue(new BSON.ObjectId('65c19f4018898af31684c4a7'))
    ).toEqual({ $oid: '65c19f4018898af31684c4a7' });
  });

  it('falls back for one unserializable console argument', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(serializeMongoRawQueryLogArgument(circular)).toBe(
      '[Unserializable Mongo value]'
    );
  });
});
