import { isTauri } from '~/core/helpers/environment';

async function getCurrentTauriWindow() {
  if (!isTauri()) {
    throw new Error('Tauri runtime is not available');
  }

  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  return getCurrentWindow();
}

export async function minimizeTauriWindow(): Promise<void> {
  const appWindow = await getCurrentTauriWindow();
  await appWindow.minimize();
}

export async function toggleTauriWindowMaximize(): Promise<void> {
  const appWindow = await getCurrentTauriWindow();
  await appWindow.toggleMaximize();
}

export async function closeTauriWindow(): Promise<void> {
  const appWindow = await getCurrentTauriWindow();
  await appWindow.close();
}

export async function isTauriWindowMaximized(): Promise<boolean> {
  const appWindow = await getCurrentTauriWindow();
  return appWindow.isMaximized();
}

export async function onTauriWindowResized(
  callback: (isMaximized: boolean) => void
): Promise<() => void> {
  const appWindow = await getCurrentTauriWindow();

  return appWindow.onResized(async () => {
    callback(await appWindow.isMaximized());
  });
}
