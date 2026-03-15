import { computed } from 'vue';
import { baseTableThemeDark, baseTableThemeLight } from '../constants';

/**
 * Returns a reactive AG Grid theme that switches between light and dark
 * automatically when the global color mode changes.
 */
export function useTableTheme() {
  const colorMode = useColorMode();
  return computed(() =>
    colorMode.value === 'dark' ? baseTableThemeDark : baseTableThemeLight
  );
}
