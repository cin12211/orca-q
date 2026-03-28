import { useTauriUpdater } from '~/core/composables/useTauriUpdater';
import { isTauri } from '~/core/helpers/environment';

export default defineNuxtPlugin(async () => {
  if (!isTauri()) {
    return;
  }

  const { checkForUpdatesOnStartup, startBackgroundUpdateChecks } =
    useTauriUpdater();
  await checkForUpdatesOnStartup();
  startBackgroundUpdateChecks();
});
