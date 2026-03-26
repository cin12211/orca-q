import { describe, it, expect } from 'vitest';
import { jsonFormat, toRawJSON } from '@/core/helpers/jsonFormat';

describe('jsonFormat utilities', () => {
  it('pretty prints JSON with spaces', () => {
    const compact = JSON.stringify({ a: 1, b: [1, 2] });
    const pretty = jsonFormat(compact, { type: 'space', size: 2 });
    expect(pretty).toContain('\n');
  });

  it('throws on unrecognized indent type', () => {
    const compact = JSON.stringify({ a: 1 });
    // @ts-expect-error testing invalid config
    expect(() => jsonFormat(compact, { type: 'invalid' })).toThrow();
  });

  it('toRawJSON deep clones the object', () => {
    const obj = { a: 1, b: { c: 2 } };
    const clone = toRawJSON(obj);
    expect(clone).toEqual(obj);
    expect(clone).not.toBe(obj);
  });

  it('normalizes arrays without extra whitespace', () => {
    const arr = JSON.stringify([1, 2, 3]);
    const formatted = jsonFormat(arr, { type: 'tab' });
    expect(formatted).toContain('[1,2,3]');
  });

  it('parses and formats nested strings correctly', () => {
    const obj = { s: 'a"b' };
    const formatted = jsonFormat(JSON.stringify(obj), {
      type: 'space',
      size: 2,
    });
    expect(formatted).toContain('"s": "a\\"b"');
  });

  it('pretty prints JSON with tab indentation by default', () => {
    const compact = JSON.stringify({ a: 1 });
    const formatted = jsonFormat(compact);
    expect(formatted).toContain('\n\t"a": 1');
  });

  it('preserves numeric arrays in compact inline form', () => {
    const compact = JSON.stringify({ n: [1, 2, 3] });
    const formatted = jsonFormat(compact, { type: 'space', size: 2 });
    expect(formatted).toContain('"n": [1,2,3]');
  });

  it('throws for invalid json string', () => {
    expect(() => jsonFormat('{bad', { type: 'space', size: 2 })).toThrow();
  });

  it('toRawJSON removes non-serializable function values', () => {
    const value = { a: 1, fn: () => 1 } as any;
    const result = toRawJSON(value);
    expect(result).toEqual({ a: 1 });
  });

  it('toRawJSON converts Date to ISO string', () => {
    const value = { d: new Date('2025-01-01T00:00:00.000Z') };
    const result = toRawJSON(value as any) as any;
    expect(typeof result.d).toBe('string');
    expect(result.d).toContain('2025-01-01T00:00:00.000Z');
  });
});
