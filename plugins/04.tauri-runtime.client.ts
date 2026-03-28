import { isTauri } from '~/core/helpers/environment';
import { pingTauri } from '~/core/platform/tauri';

export default defineNuxtPlugin(async () => {
  if (!isTauri()) {
    return;
  }

  try {
    const message = await pingTauri();
    console.info(`[Tauri] ${message}`);
  } catch (error) {
    console.error('[Tauri] Backend bootstrap failed', error);
  }
});
