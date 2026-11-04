import { describe, it, expect } from 'vitest';
import * as helpers from '@/core/helpers';

describe('core/helpers index exports', () => {
  it('exports main helper functions', () => {
    expect(typeof helpers.uuidv4).toBe('function');
    expect(typeof helpers.formatBytes).toBe('function');
  });

  it('exports json utilities', () => {
    expect(typeof helpers.jsonFormat).toBe('function');
    expect(typeof helpers.toRawJSON).toBe('function');
  });

  it('exports deepUnref', () => {
    expect(typeof helpers.deepUnref).toBe('function');
  });

  it('index re-exports do not throw when accessed', () => {
    Object.keys(helpers).forEach(k => {
      expect(k.length).toBeGreaterThan(0);
    });
  });

  it('imports are stable across calls', () => {
    const a = Object.keys(helpers);
    const b = Object.keys(helpers);
    expect(a).toEqual(b);
  });

  it('exports format utilities', () => {
    expect(typeof helpers.formatQueryTime).toBe('function');
    expect(typeof helpers.formatDuration).toBe('function');
  });

  it('exports data conversion utilities', () => {
    expect(typeof helpers.convertParameters).toBe('function');
    expect(typeof helpers.buildMappedColumnsFromKeys).toBe('function');
  });

  it('exports clipboard/data helpers', () => {
    expect(typeof helpers.copyRowsData).toBe('function');
    expect(typeof helpers.cleanRows).toBe('function');
  });

  it('uuidv4 can be called from index export', () => {
    expect(typeof helpers.uuidv4()).toBe('string');
  });

  it('formatBytes can be called from index export', () => {
    expect(helpers.formatBytes(1024)).toContain('KB');
  });
});
