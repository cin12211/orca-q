import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyRowsToClipboard } from '@/core/helpers/copyRowsToClipboard';

describe('copyRowsToClipboard', () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      writable: true,
      value: {
        ...(originalNavigator ?? {}),
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      writable: true,
      value: originalNavigator,
    });
    vi.clearAllMocks();
  });

  it('does nothing for empty or non-array inputs', () => {
    copyRowsToClipboard([]);
    expect(
      (globalThis as any).navigator.clipboard.writeText
    ).not.toHaveBeenCalled();
  });

  it('copies single row as TSV', () => {
    copyRowsToClipboard([{ a: 1, b: 2 }]);
    expect(
      (globalThis as any).navigator.clipboard.writeText
    ).toHaveBeenCalled();
    const text = (globalThis as any).navigator.clipboard.writeText.mock
      .calls[0][0];
    expect(text).toContain('\t');
    expect(text).toContain('1');
  });

  it('copies multiple rows with newline separation', () => {
    copyRowsToClipboard([{ a: 'x' }, { a: 'y' }]);
    const text = (globalThis as any).navigator.clipboard.writeText.mock
      .calls[0][0];
    expect(text.split('\n')).toHaveLength(2);
  });

  it('stringifies values to string when building rows', () => {
    copyRowsToClipboard([{ a: { nested: true } } as any]);
    const text = (globalThis as any).navigator.clipboard.writeText.mock
      .calls[0][0];
    expect(text).toContain('[object Object]');
  });

  it('handles numeric and boolean values', () => {
    copyRowsToClipboard([{ n: 5, ok: true } as any]);
    const text = (globalThis as any).navigator.clipboard.writeText.mock
      .calls[0][0];
    expect(text).toContain('5');
    expect(text).toContain('true');
  });

  it('does nothing for non-array value', () => {
    copyRowsToClipboard('abc' as any);
    expect(
      (globalThis as any).navigator.clipboard.writeText
    ).not.toHaveBeenCalled();
  });

  it('does nothing for null input', () => {
    copyRowsToClipboard(null as any);
    expect(
      (globalThis as any).navigator.clipboard.writeText
    ).not.toHaveBeenCalled();
  });

  it('keeps column order from object entries', () => {
    copyRowsToClipboard([{ a: 'x', b: 'y', c: 'z' }]);
    const text = (globalThis as any).navigator.clipboard.writeText.mock
      .calls[0][0];
    expect(text).toBe('x\ty\tz');
  });

  it('adds exactly one newline for two rows', () => {
    copyRowsToClipboard([{ a: 1 }, { a: 2 }]);
    const text = (globalThis as any).navigator.clipboard.writeText.mock
      .calls[0][0];
    expect((text.match(/\n/g) || []).length).toBe(1);
  });

  it('handles undefined values by string conversion', () => {
    copyRowsToClipboard([{ a: undefined } as any]);
    const text = (globalThis as any).navigator.clipboard.writeText.mock
      .calls[0][0];
    expect(text).toContain('undefined');
  });
});
