import * as amplitude from '@amplitude/analytics-browser';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useAmplitude } from '~/core/composables/useAmplitude';

vi.mock('@amplitude/analytics-browser', () => ({
  init: vi.fn(),
  track: vi.fn(),
  reset: vi.fn(),
}));

describe('useAmplitude', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exposes initialize, trackEvent and reset methods', () => {
    const composable = useAmplitude();

    expect(typeof composable.initialize).toBe('function');
    expect(typeof composable.trackEvent).toBe('function');
    expect(typeof composable.reset).toBe('function');
  });

  it('tracks an event with custom properties', () => {
    const { trackEvent } = useAmplitude();

    trackEvent('query_executed', { durationMs: 50, success: true });

    expect(amplitude.track).toHaveBeenCalledWith('query_executed', {
      durationMs: 50,
      success: true,
    });
  });

  it('tracks an event with empty object by default', () => {
    const { trackEvent } = useAmplitude();

    trackEvent('opened_panel');

    expect(amplitude.track).toHaveBeenCalledWith('opened_panel', {});
  });

  it('resets analytics session', () => {
    const { reset } = useAmplitude();

    reset();

    expect(amplitude.reset).toHaveBeenCalledTimes(1);
  });

  it('tracks multiple events independently', () => {
    const { trackEvent } = useAmplitude();

    trackEvent('event_a', { value: 1 });
    trackEvent('event_b', { value: 2 });

    expect(amplitude.track).toHaveBeenCalledTimes(2);
  });

  it('initialize does not throw even when config is missing', () => {
    const { initialize } = useAmplitude();

    expect(() => initialize()).not.toThrow();
  });

  it('initialize either starts amplitude or warns for missing key', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { initialize } = useAmplitude();

    initialize();

    const totalSignals =
      (amplitude.init as any).mock.calls.length + warnSpy.mock.calls.length;

    expect(totalSignals).toBeGreaterThan(0);
    warnSpy.mockRestore();
  });

  it('allows tracking after reset', () => {
    const { reset, trackEvent } = useAmplitude();

    reset();
    trackEvent('post_reset_event', { ok: true });

    expect(amplitude.track).toHaveBeenCalledWith('post_reset_event', {
      ok: true,
    });
  });
});
