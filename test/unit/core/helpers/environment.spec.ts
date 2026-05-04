import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as env from '@/core/helpers/environment';

const setNavigator = (value: any) => {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    writable: true,
    value,
  });
};

describe('environment helpers', () => {
  const originalNavigator = globalThis.navigator;

  beforeAll(() => {
    // ensure navigator always exists for all tests
    setNavigator({});
  });

  afterAll(() => {
    setNavigator(originalNavigator);
  });

  it('isDesktopApp returns boolean', () => {
    const v = env.isDesktopApp();
    expect(typeof v).toBe('boolean');
  });

  it('isPWA returns boolean', () => {
    const v = env.isPWA();
    expect(typeof v).toBe('boolean');
  });

  it('isPWA checks navigator.windowControlsOverlay if present', () => {
    setNavigator({
      windowControlsOverlay: { visible: true },
    });

    expect(env.isPWA()).toBe(true);
  });

  it('isPWA false when windowControlsOverlay missing', () => {
    setNavigator({});
    expect(env.isPWA()).toBe(false);
  });

  it('isPWA false when windowControlsOverlay.visible is false', () => {
    setNavigator({
      windowControlsOverlay: { visible: false },
    });

    expect(env.isPWA()).toBe(false);
  });
});
