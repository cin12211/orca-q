import { invokeTauri } from './tauri';

export type DesktopStorageTarget = 'nativeData' | 'webStorage';

export interface DesktopStoragePaths {
  nativeDataPath: string;
  webStoragePath: string | null;
}

export async function getDesktopStoragePaths(): Promise<DesktopStoragePaths> {
  return await invokeTauri<DesktopStoragePaths>('desktop_storage_paths');
}

export async function openDesktopStoragePath(
  target: DesktopStorageTarget
): Promise<void> {
  await invokeTauri('open_desktop_storage_path', { target });
}
