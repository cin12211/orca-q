import { describe, it, expect } from 'vitest';
import * as env from '@/core/helpers/environment';

const setNavigator = (value: Navigator | Record<string, unknown>) => {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    writable: true,
    value,
  });
};

describe('environment helpers', () => {
  it('isTauri returns boolean (default false)', () => {
    const v = env.isTauri();
    expect(typeof v).toBe('boolean');
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
    const origNav = globalThis.navigator;
    try {
      setNavigator({
        windowControlsOverlay: { visible: true },
      });
      expect(env.isPWA()).toBe(true);
    } finally {
      setNavigator(origNav);
    }
  });

  it('detects Tauri via window global', () => {
    const origWindow = (globalThis as any).window;
    try {
      (globalThis as any).window = { __TAURI__: { core: {} } } as any;
      expect(env.isTauri()).toBe(true);
      expect(env.isDesktopApp()).toBe(true);
    } finally {
      (globalThis as any).window = origWindow;
    }
  });

  it('isPWA false when windowControlsOverlay missing', () => {
    const origNav = globalThis.navigator;
    try {
      setNavigator({});
      expect(env.isPWA()).toBe(false);
    } finally {
      setNavigator(origNav);
    }
  });

  it('isPWA false when windowControlsOverlay.visible is false', () => {
    const origNav = globalThis.navigator;
    try {
      setNavigator({
        windowControlsOverlay: { visible: false },
      });
      expect(env.isPWA()).toBe(false);
    } finally {
      setNavigator(origNav);
    }
  });
});
