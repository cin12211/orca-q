import { describe, expect, it } from 'vitest';
import { MongoFilterMode } from '~/components/modules/quick-query/mongodb/types';
import {
  buildMongoFilterPayload,
  extractFieldsFromDocuments,
  formatMongoFilterToRaw,
} from '~/components/modules/quick-query/mongodb/utils/mongoFilterUtils';

describe('mongoFilterUtils', () => {
  it('builds visual filter payload correctly', () => {
    const rows = [
      {
        isSelect: true,
        field: 'name',
        operator: '$eq' as const,
        value: 'John',
      },
      { isSelect: true, field: 'age', operator: '$gte' as const, value: '18' },
      {
        isSelect: false,
        field: 'status',
        operator: '$eq' as const,
        value: 'draft',
      },
    ];

    const filter = buildMongoFilterPayload(rows, '', MongoFilterMode.Visual);
    expect(filter).toEqual({
      name: 'John',
      age: { $gte: 18 },
    });
  });

  it('parses raw JSON filter text correctly', () => {
    const rawText = '{ "status": "active", "qty": { "$gt": 10 } }';
    const filter = buildMongoFilterPayload([], rawText, MongoFilterMode.Raw);
    expect(filter).toEqual({
      status: 'active',
      qty: { $gt: 10 },
    });
  });

  it('parses Mongo shell ObjectId shorthand into Canonical EJSON', () => {
    const filter = buildMongoFilterPayload(
      [],
      '{ "businessId": ObjectId(\'65c19f4018898af31684c4a7\') }',
      MongoFilterMode.Raw
    );

    expect(filter).toEqual({
      businessId: { $oid: '65c19f4018898af31684c4a7' },
    });
  });

  it('throws error for invalid raw JSON filter', () => {
    expect(() =>
      buildMongoFilterPayload([], '{ invalid: json }', MongoFilterMode.Raw)
    ).toThrow();
  });

  it('extracts unique document fields with _id first including 1-level nested fields', () => {
    const docs = [
      {
        _id: '1',
        name: 'Alice',
        age: 25,
        roomServices: { cbd: 'test1', note: 'test' },
      },
      {
        _id: '2',
        email: 'bob@example.com',
        name: 'Bob',
        customers: [{ name: 'Child' }],
      },
    ];

    const fields = extractFieldsFromDocuments(docs);
    expect(fields).toEqual([
      '_id',
      'age',
      'customers',
      'customers.name',
      'email',
      'name',
      'roomServices',
      'roomServices.cbd',
      'roomServices.note',
    ]);
  });

  it('formats visual rows to raw JSON string', () => {
    const rows = [
      {
        isSelect: true,
        field: 'role',
        operator: '$eq' as const,
        value: 'admin',
      },
    ];
    const raw = formatMongoFilterToRaw(rows);
    expect(JSON.parse(raw)).toEqual({ role: 'admin' });
  });

  it('skips unfilled _id visual filter rows when value is empty', () => {
    const rows = [
      {
        isSelect: true,
        field: '_id',
        operator: '$eq' as const,
        value: '',
      },
    ];
    const filter = buildMongoFilterPayload(rows, '', MongoFilterMode.Visual);
    expect(filter).toBeUndefined();
  });

  it('does not block invalid _id on FE, letting it pass to server validation', () => {
    const rows = [
      {
        isSelect: true,
        field: '_id',
        operator: '$eq' as const,
        value: 'not-an-object-id',
      },
    ];
    const filter = buildMongoFilterPayload(rows, '', MongoFilterMode.Visual);
    expect(filter).toEqual({ _id: 'not-an-object-id' });
  });

  it('accepts valid 24-character hex ObjectId in visual mode', () => {
    const rows = [
      {
        isSelect: true,
        field: '_id',
        operator: '$eq' as const,
        value: '507f1f77bcf86cd799439011',
      },
    ];
    const filter = buildMongoFilterPayload(rows, '', MongoFilterMode.Visual);
    expect(filter).toEqual({
      _id: '507f1f77bcf86cd799439011',
    });
  });
});
