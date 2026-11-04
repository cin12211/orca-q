import { describe, it, expect } from 'vitest';
import { convertParameters } from '@/core/helpers/convertParameters';

describe('convertParameters', () => {
  it('parses object-like parameters with unquoted keys', () => {
    const input = "-- PARAMETERS: {a: 1, b: 'x'}";
    const res = convertParameters(input);
    expect(res.type).toBe('object');
    expect(res.values).toHaveProperty('a');
    expect(res.values).toHaveProperty('b');
    expect(res.values?.a).toBe(1);
  });

  it('parses JSON-style quoted keys', () => {
    const input = `-- PARAMETERS: {"x": 2, "y": 'z'}`;
    const res = convertParameters(input);
    expect(res.type).toBe('object');
    expect(res.values?.x).toBe(2);
    expect(res.values?.y).toBe("'z'");
  });

  it('parses arrays into object with numeric keys', () => {
    const input = "-- PARAMETERS: [1, 'a', null]";
    const res = convertParameters(input);
    expect(res.type).toBe('object');
    expect(res.values).toHaveProperty('1');
    expect(res.values).toHaveProperty('2');
    expect(res.values).toHaveProperty('3');
  });

  it('returns undefined type for invalid JSON', () => {
    const input = '-- PARAMETERS: notjson';
    const res = convertParameters(input);
    expect(res.type).toBeUndefined();
    expect(res.values).toBeUndefined();
  });

  it('returns undefined for empty array parameters', () => {
    const input = '-- PARAMETERS: []';
    const res = convertParameters(input);
    expect(res.type).toBeUndefined();
    expect(res.values).toBeUndefined();
  });

  it('returns undefined for empty object parameters', () => {
    const res = convertParameters('-- PARAMETERS: {}');
    expect(res.type).toBeUndefined();
    expect(res.values).toBeUndefined();
  });

  it('formats string values with single quotes', () => {
    const res = convertParameters("-- PARAMETERS: {name: 'hera'}");
    expect(res.type).toBe('object');
    expect(res.values?.name).toBe("'hera'");
  });

  it('formats null values as NULL string', () => {
    const res = convertParameters('-- PARAMETERS: {a: null}');
    expect(res.type).toBe('object');
    expect(res.values?.a).toBe('NULL');
  });

  it('maps array indexes to string keys starting at 1', () => {
    const res = convertParameters('-- PARAMETERS: [10, 20]');
    expect(res.type).toBe('object');
    expect(Object.keys(res.values || {})).toEqual(['1', '2']);
  });

  it('supports numeric keys in object syntax', () => {
    const res = convertParameters('-- PARAMETERS: {1: "a", 2: "b"}');
    expect(res.type).toBe('object');
    expect(res.values?.['1']).toBe("'a'");
    expect(res.values?.['2']).toBe("'b'");
  });
});
