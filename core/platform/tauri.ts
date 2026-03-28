import { isTauri } from '~/core/helpers/environment';

export async function invokeTauri<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  if (!isTauri()) {
    throw new Error('Tauri runtime is not available');
  }

  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, args);
}

export const pingTauri = async (): Promise<string> => invokeTauri('ping');
