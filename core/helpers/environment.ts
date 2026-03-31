/**
 * Detect the runtime environment.
 * Provides helpers to identify PWA and desktop contexts.
 */

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

export const isDesktopApp = (): boolean => isElectron();

export function isElectron(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    typeof (window as Window & { electronAPI?: unknown }).electronAPI ===
    'object'
  );
}

export const isPWA = (): boolean => {
  if (!!('windowControlsOverlay' in navigator)) {
    return !!(navigator.windowControlsOverlay as any)?.visible;
  }

  return false;
};
