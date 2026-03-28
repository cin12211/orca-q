import type {
  CheckOptions,
  DownloadEvent,
  Update,
} from '@tauri-apps/plugin-updater';
import { isTauri } from '~/core/helpers/environment';

export async function checkForTauriUpdate(
  options?: CheckOptions
): Promise<Update | null> {
  if (!isTauri()) {
    return null;
  }

  const { check } = await import('@tauri-apps/plugin-updater');
  return check(options);
}

export async function relaunchTauriApp(): Promise<void> {
  if (!isTauri()) {
    throw new Error('Tauri runtime is not available');
  }

  const { relaunch } = await import('@tauri-apps/plugin-process');
  await relaunch();
}

export type { CheckOptions, DownloadEvent, Update };
