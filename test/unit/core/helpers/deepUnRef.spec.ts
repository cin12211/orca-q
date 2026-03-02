import { ref, reactive } from 'vue';
import { describe, it, expect } from 'vitest';
import { deepUnref } from '@/core/helpers/deepUnRef';

describe('deepUnref', () => {
  it('unwraps refs at top-level', () => {
    const value = ref(1);
    const result = deepUnref(value as any);
    expect(result).toBe(1);
  });

  it('recurses into objects and arrays', () => {
    const input = {
      a: ref(1),
      b: [ref(2), { c: ref('x') }],
      d: reactive({ e: ref(true) }) as any,
    };
    const out = deepUnref(input as any);
    expect(out).toEqual({ a: 1, b: [2, { c: 'x' }], d: { e: true } });
  });

  it('returns primitives unchanged', () => {
    expect(deepUnref(5 as any)).toBe(5);
    expect(deepUnref('s' as any)).toBe('s');
  });

  it('handles nested arrays', () => {
    const input = [ref(1), [ref(2), { a: ref(3) }]];
    const out = deepUnref(input as any);
    expect(out).toEqual([1, [2, { a: 3 }]]);
  });

  it('does not mutate the original refs', () => {
    const r = ref(10);
    const obj = { a: r } as any;
    const out = deepUnref(obj);
    expect(out.a).toBe(10);
    expect(obj.a).toBe(r); // original still a ref
  });

  it('handles null input', () => {
    expect(deepUnref(null as any)).toBeNull();
  });

  it('handles undefined input', () => {
    expect(deepUnref(undefined as any)).toBeUndefined();
  });

  it('unwraps ref containing array', () => {
    const v = ref([ref(1), ref(2)]);
    expect(deepUnref(v as any)).toEqual([1, 2]);
  });

  it('unwraps nested object refs deeply', () => {
    const input = { a: { b: { c: ref('ok') } } };
    expect(deepUnref(input as any)).toEqual({ a: { b: { c: 'ok' } } });
  });

  it('keeps plain objects intact except unwrapping', () => {
    const input = { a: 1, b: { c: 2 } };
    expect(deepUnref(input as any)).toEqual(input);
  });
});
