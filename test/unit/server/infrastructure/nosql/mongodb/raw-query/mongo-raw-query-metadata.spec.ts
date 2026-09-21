import { describe, expect, it } from 'vitest';
import {
  extractMongoJsonSchemaFieldPaths,
  inferMongoFieldPaths,
} from '~/server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query-metadata';

describe('Mongo raw query metadata', () => {
  it('infers sorted dotted field paths with bounded depth', () => {
    expect(
      inferMongoFieldPaths(
        [
          {
            _id: { $oid: 'abc' },
            profile: { name: 'Ada', address: { city: 'HN' } },
          },
          { profile: { name: 'Lin' }, active: true },
        ],
        2
      )
    ).toEqual(['_id', 'active', 'profile', 'profile.address', 'profile.name']);
  });

  it('extracts fields from a collection JSON Schema validator', () => {
    expect(
      extractMongoJsonSchemaFieldPaths(
        {
          bsonType: 'object',
          properties: {
            profile: {
              bsonType: 'object',
              properties: { name: { bsonType: 'string' } },
            },
            active: { bsonType: 'bool' },
          },
        },
        2
      )
    ).toEqual(['active', 'profile', 'profile.name']);
  });
});
