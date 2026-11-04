import { describe, it, expect } from 'vitest';
import {
  formatQueryTime,
  formatNumber,
  formatDuration,
} from '@/core/helpers/format';

describe('format utilities', () => {
  it('formatQueryTime uses μs for <1ms', () => {
    expect(formatQueryTime(0.5)).toContain('μs');
  });

  it('formatQueryTime uses ms for small durations', () => {
    expect(formatQueryTime(10)).toContain('ms');
  });

  it('formatQueryTime uses s for >1000ms and minutes for long', () => {
    expect(formatQueryTime(1500)).toContain('s');
    expect(formatQueryTime(61_000)).toMatch(/1m/);
  });

  it('formatNumber formats with en-US separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('formatDuration handles undefined and edge cases', () => {
    expect(formatDuration()).toBe('-');
    expect(formatDuration(0.0005)).toBe('<0.001ms');
    expect(formatDuration(0.5)).toContain('µs');
    expect(formatDuration(1500)).toContain('s');
  });

  it('formatQueryTime rounds microseconds correctly', () => {
    expect(formatQueryTime(0.001)).toBe('1 μs');
  });

  it('formatQueryTime shows milliseconds with 2 decimals', () => {
    expect(formatQueryTime(1.234)).toBe('1.23 ms');
  });

  it('formatQueryTime shows seconds for values under a minute', () => {
    expect(formatQueryTime(30_000)).toBe('30.00 s');
  });

  it('formatQueryTime shows minute-second format for long durations', () => {
    expect(formatQueryTime(90_500)).toBe('1m 30.50s');
  });

  it('formatNumber handles zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('formatNumber handles negative numbers', () => {
    expect(formatNumber(-1200)).toBe('-1,200');
  });

  it('formatDuration outputs milliseconds under 1000ms', () => {
    expect(formatDuration(12.345)).toBe('12.35ms');
  });

  it('formatDuration outputs seconds for >=1000ms', () => {
    expect(formatDuration(2000)).toBe('2.00s');
  });

  it('formatDuration handles tiny positive values', () => {
    expect(formatDuration(0.0001)).toBe('<0.001ms');
  });
});
