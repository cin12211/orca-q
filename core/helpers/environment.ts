/**
 * Detect the runtime environment.
 * Provides helpers to identify Electron, Tauri, and PWA contexts.
 */

export function isElectron(): boolean {
  // Renderer process
  if (
    typeof window !== 'undefined' &&
    typeof window.process === 'object' &&
    window.process.type === 'renderer'
  ) {
    return true;
  }

  // Main process
  if (
    typeof process !== 'undefined' &&
    typeof process.versions === 'object' &&
    !!process.versions.electron
  ) {
    return true;
  }

  // Detect the user agent when the `nodeIntegration` option is set to true
  if (
    typeof navigator === 'object' &&
    typeof navigator.userAgent === 'string' &&
    navigator.userAgent.indexOf('Electron') >= 0
  ) {
    return true;
  }

  return false;
}

export function isTauri(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const tauriWindow = window as Window & {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  };

  return (
    typeof tauriWindow.__TAURI__ === 'object' ||
    typeof tauriWindow.__TAURI_INTERNALS__ === 'object'
  );
}

export function isMacOS(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  if (
    typeof navigator.userAgentData === 'object' &&
    typeof navigator.userAgentData.platform === 'string'
  ) {
    return navigator.userAgentData.platform.toLowerCase() === 'macos';
  }

  return /mac/i.test(navigator.userAgent) || /mac/i.test(navigator.platform);
}

export const isDesktopApp = (): boolean => isElectron() || isTauri();

export const isPWA = (): boolean => {
  if (!!('windowControlsOverlay' in navigator)) {
    return !!(navigator.windowControlsOverlay as any)?.visible;
  }

  return false;
};
