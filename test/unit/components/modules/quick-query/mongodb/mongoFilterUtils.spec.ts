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
});
