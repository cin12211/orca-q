import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HASH_INDEX_ID } from '@/components/base/dynamic-table/constants/constants';
import {
  copyToClipboard,
  cleanRows,
  copyColumnData,
  copyRowsData,
  exportData,
} from '@/core/helpers/copyData';

describe('copyData helpers', () => {
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

  it('cleanRows removes HASH_INDEX_ID and stringifies nested when requested', () => {
    const rows = [{ a: 1, nested: { x: 2 }, [HASH_INDEX_ID]: 5 }];
    const cleaned = cleanRows(rows, true);
    expect(cleaned[0]).not.toHaveProperty(HASH_INDEX_ID);
    expect(typeof cleaned[0].nested).toBe('string');
  });

  it('cleanRows keeps nested objects when withStringifyNested=false', () => {
    const rows = [{ a: 1, nested: { x: 2 }, [HASH_INDEX_ID]: 5 }];
    const cleaned = cleanRows(rows, false);
    expect(typeof cleaned[0].nested).toBe('object');
    expect(cleaned[0]).not.toHaveProperty(HASH_INDEX_ID);
  });

  it('copyColumnData copies JSON when format=json', async () => {
    const rows = [{ a: 1 }, { a: 2 }];
    copyColumnData(rows as any, 'a', 'json');
    expect(
      (globalThis as any).navigator.clipboard.writeText
    ).toHaveBeenCalled();
    const calledWith = (globalThis as any).navigator.clipboard.writeText.mock
      .calls[0][0];
    expect(calledWith).toContain('[');
  });

  it('copyRowsData with sql triggers clipboard write with INSERT', () => {
    const rows = [{ id: 1, name: "O'Connor" }];
    copyRowsData(rows as any, 'users', 'sql');
    expect(
      (globalThis as any).navigator.clipboard.writeText
    ).toHaveBeenCalled();
    const arg = (globalThis as any).navigator.clipboard.writeText.mock
      .calls[0][0];
    expect(arg).toContain('INSERT INTO');
    expect(arg).toContain("O''Connor");
  });

  it('exportData returns early for empty rows', () => {
    expect(exportData([], 't', 'json', 'all')).toBeUndefined();
  });

  it('copyToClipboard writes provided text', async () => {
    await copyToClipboard('hello');
    expect(
      (globalThis as any).navigator.clipboard.writeText
    ).toHaveBeenCalledWith('hello');
  });

  it('copyColumnData list format joins by newline', () => {
    const rows = [{ a: 'x' }, { a: 'y' }];
    copyColumnData(rows as any, 'a', 'list');
    const value = (globalThis as any).navigator.clipboard.writeText.mock
      .calls[0][0];
    expect(value).toBe('x\ny');
  });

  it('copyColumnData returns early when no colId', () => {
    copyColumnData([{ a: 1 }] as any, '', 'json');
    expect(
      (globalThis as any).navigator.clipboard.writeText
    ).not.toHaveBeenCalled();
  });

  it('copyRowsData returns early for empty rows', () => {
    copyRowsData([], 'users', 'json');
    expect(
      (globalThis as any).navigator.clipboard.writeText
    ).not.toHaveBeenCalled();
  });

  it('copyRowsData csv-with-header uses tab delimiter', () => {
    copyRowsData([{ a: 1, b: 2 }] as any, 'users', 'csv-with-header');
    const text = (globalThis as any).navigator.clipboard.writeText.mock
      .calls[0][0];
    expect(text).toContain('\t');
    expect(text).toContain('a');
  });

  it('copyRowsData csv-no-header excludes header row', () => {
    copyRowsData([{ a: 1, b: 2 }] as any, 'users', 'csv-no-header');
    const text = (globalThis as any).navigator.clipboard.writeText.mock
      .calls[0][0];
    expect(text).toBe('1\t2');
  });

  it('copyRowsData json copies JSON array payload', () => {
    copyRowsData([{ a: 1 }] as any, 'users', 'json');
    const text = (globalThis as any).navigator.clipboard.writeText.mock
      .calls[0][0];
    expect(text).toBe('[{"a":1}]');
  });

  it('cleanRows does not mutate source rows', () => {
    const source = [{ a: 1, [HASH_INDEX_ID]: 1 }];
    const before = JSON.stringify(source);
    cleanRows(source as any, false);
    expect(JSON.stringify(source)).toBe(before);
  });

  it('cleanRows keeps Date values when stringifyNested=true', () => {
    const date = new Date('2025-01-01T00:00:00Z');
    const rows = [{ createdAt: date, [HASH_INDEX_ID]: 1 }];
    const cleaned = cleanRows(rows as any, true);
    expect(cleaned[0].createdAt).toBe(date);
  });
});
