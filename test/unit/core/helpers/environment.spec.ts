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
  it('isElectron returns boolean (default false)', () => {
    const v = env.isElectron();
    expect(typeof v).toBe('boolean');
  });

  it('isPWA returns boolean', () => {
    const v = env.isPWA();
    expect(typeof v).toBe('boolean');
  });

  it('detects Electron via window.process.type', () => {
    const origWindow = (globalThis as any).window;
    try {
      (globalThis as any).window = { process: { type: 'renderer' } } as any;
      expect(env.isElectron()).toBe(true);
    } finally {
      (globalThis as any).window = origWindow;
    }
  });

  it('detects Electron via process.versions', () => {
    const origProcess = (globalThis as any).process;
    try {
      (globalThis as any).process = { versions: { electron: '1.0' } } as any;
      expect(env.isElectron()).toBe(true);
    } finally {
      (globalThis as any).process = origProcess;
    }
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

  it('isElectron false when no electron signals exist', () => {
    const origWindow = (globalThis as any).window;
    const origProcess = (globalThis as any).process;
    const origNav = globalThis.navigator;
    try {
      (globalThis as any).window = undefined;
      (globalThis as any).process = { versions: {} };
      setNavigator({ userAgent: 'Mozilla/5.0' });
      expect(env.isElectron()).toBe(false);
    } finally {
      (globalThis as any).window = origWindow;
      (globalThis as any).process = origProcess;
      setNavigator(origNav);
    }
  });

  it('detects Electron via userAgent', () => {
    const origNav = globalThis.navigator;
    try {
      setNavigator({ userAgent: 'MyApp Electron/30' });
      expect(env.isElectron()).toBe(true);
    } finally {
      setNavigator(origNav);
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

  it('detects renderer process only when type is renderer', () => {
    const origWindow = (globalThis as any).window;
    try {
      (globalThis as any).window = { process: { type: 'browser' } } as any;
      expect(env.isElectron()).toBe(false);
    } finally {
      (globalThis as any).window = origWindow;
    }
  });
});
