import { describe, expect, it } from 'vitest';
import { parseMongoMoreOptionsInput } from '~/components/modules/quick-query/mongodb/utils/mongoMoreOptionsUtils';

describe('parseMongoMoreOptionsInput', () => {
  it('parses valid JSON fields correctly', () => {
    const raw = {
      project: '{"name": 1, "email": 1}',
      sort: '{"createdAt": -1}',
      collation: '{"locale": "simple"}',
      hint: 'email_1',
      maxTimeMS: 5000,
    };
    const { payload, errors } = parseMongoMoreOptionsInput(raw);
    expect(errors).toEqual({});
    expect(payload.project).toEqual({ name: 1, email: 1 });
    expect(payload.sort).toEqual({ createdAt: -1 });
    expect(payload.collation).toEqual({ locale: 'simple' });
    expect(payload.hint).toBe('email_1');
    expect(payload.maxTimeMS).toBe(5000);
  });

  it('supports JSON object index hint', () => {
    const raw = {
      hint: '{"_id": 1}',
    };
    const { payload, errors } = parseMongoMoreOptionsInput(raw);
    expect(errors).toEqual({});
    expect(payload.hint).toEqual({ _id: 1 });
  });

  it('ignores empty, whitespace, and placeholder strings', () => {
    const raw = {
      project: '',
      sort: '   ',
      collation: '',
      hint: '—',
      maxTimeMS: '',
    };
    const { payload, errors } = parseMongoMoreOptionsInput(raw);
    expect(errors).toEqual({});
    expect(payload.project).toBeUndefined();
    expect(payload.sort).toBeUndefined();
    expect(payload.collation).toBeUndefined();
    expect(payload.hint).toBeUndefined();
    expect(payload.maxTimeMS).toBeUndefined();
  });

  it('reports errors for malformed JSON in fields', () => {
    const raw = {
      project: '{ invalid_json }',
      sort: '{"valid": 1}',
    };
    const { payload, errors } = parseMongoMoreOptionsInput(raw);
    expect(errors.project).toBeDefined();
    expect(payload.sort).toEqual({ valid: 1 });
  });
});
