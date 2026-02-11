/**
 * Detect the runtime environment.
 * Provides helpers to identify Electron and PWA contexts.
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

export const isPWA = (): boolean => {
  if (!!('windowControlsOverlay' in navigator)) {
    return !!(navigator.windowControlsOverlay as any)?.visible;
  }

  return false;
};
