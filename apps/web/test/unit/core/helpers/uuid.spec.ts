import { describe, it, expect } from 'vitest';
import { uuidv4 } from '@/core/helpers/uuid';

describe('uuidv4', () => {
  it('generates a properly shaped UUID', () => {
    const u = uuidv4();
    expect(u).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('generates unique values over multiple calls', () => {
    const set = new Set<string>();
    for (let i = 0; i < 5; i++) set.add(uuidv4());
    expect(set.size).toBe(5);
  });

  it('contains version 4 marker at proper position', () => {
    const u = uuidv4();
    expect(u.split('-')[2][0]).toBe('4');
  });

  it('has the correct variant bits', () => {
    const u = uuidv4();
    const variantChar = u.split('-')[3][0];
    expect(/[89ab]/i.test(variantChar)).toBe(true);
  });

  it('always returns a string', () => {
    expect(typeof uuidv4()).toBe('string');
  });

  it('always has 5 groups separated by dashes', () => {
    expect(uuidv4().split('-')).toHaveLength(5);
  });

  it('has expected group lengths', () => {
    const [a, b, c, d, e] = uuidv4().split('-');
    expect(a.length).toBe(8);
    expect(b.length).toBe(4);
    expect(c.length).toBe(4);
    expect(d.length).toBe(4);
    expect(e.length).toBe(12);
  });

  it('contains only lowercase hex and dashes by default', () => {
    const v = uuidv4();
    expect(v).toMatch(/^[0-9a-f-]+$/);
  });

  it('produces 10 values with all unique entries', () => {
    const values = Array.from({ length: 10 }, () => uuidv4());
    expect(new Set(values).size).toBe(10);
  });

  it('variant nibble is one of 8,9,a,b', () => {
    const variant = uuidv4().split('-')[3][0];
    expect(['8', '9', 'a', 'b']).toContain(variant);
  });
});
