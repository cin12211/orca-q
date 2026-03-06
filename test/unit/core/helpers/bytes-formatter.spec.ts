import { describe, it, expect } from 'vitest';
import { formatBytes } from '@/core/helpers/bytes-formatter';

describe('bytes-formatter', () => {
  it('formats zero bytes', () => {
    expect(formatBytes(0)).toBe('0 bytes');
  });

  it('formats one byte', () => {
    expect(formatBytes(1)).toBe('1 bytes');
  });

  it('formats small bytes without decimals', () => {
    expect(formatBytes(500)).toBe('500 bytes');
  });

  it('formats values just below 1 KB', () => {
    expect(formatBytes(1023)).toBe('1023 bytes');
  });

  it('formats exactly 1 KB as KB unit', () => {
    expect(formatBytes(1024)).toBe('1.00 KB');
  });

  it('formats 1.5 KB with two decimals', () => {
    expect(formatBytes(1536)).toBe('1.50 KB');
  });

  it('formats 2 KB correctly', () => {
    expect(formatBytes(2048)).toBe('2.00 KB');
  });

  it('formats 1 MB correctly', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
  });

  it('formats 5 MB correctly', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.00 MB');
  });

  it('formats MB and larger units', () => {
    expect(formatBytes(1024 ** 3)).toContain('GB');
  });

  it('formats 1 TB correctly', () => {
    expect(formatBytes(1024 ** 4)).toContain('TB');
  });
});
