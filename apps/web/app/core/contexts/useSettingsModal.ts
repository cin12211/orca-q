/**
 * Global settings modal control
 * Allows opening settings modal from anywhere in the app
 */
const isSettingsOpen = ref(false);
const settingsActiveTab = ref<string>('Editor');

export function useSettingsModal() {
  const openSettings = (tab?: string) => {
    if (tab) {
      settingsActiveTab.value = tab;
    }
    isSettingsOpen.value = true;
  };

  const closeSettings = () => {
    isSettingsOpen.value = false;
  };

  return {
    isSettingsOpen,
    settingsActiveTab,
    openSettings,
    closeSettings,
  };
}
