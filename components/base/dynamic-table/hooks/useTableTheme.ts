import { computed } from 'vue';
import { useAppLayoutStore } from '~/core/stores/appLayoutStore';
import { baseTableThemeDark, baseTableThemeLight } from '../constants';

/**
 * Returns a reactive AG Grid theme that switches between light and dark
 * automatically when the global color mode changes, and applies user-defined
 * appearance settings (font size, row height, accent color).
 */
export function useTableTheme() {
  const colorMode = useColorMode();
  const appLayoutStore = useAppLayoutStore();

  return computed(() => {
    const configs = appLayoutStore.tableAppearanceConfigs;
    const isDark = colorMode.value === 'dark';
    const base = isDark ? baseTableThemeDark : baseTableThemeLight;

    const params: Record<string, unknown> = {
      fontSize: configs.fontSize,
      rowHeight: configs.rowHeight,
      spacing: configs.cellSpacing,
      accentColor: isDark ? configs.accentColorDark : configs.accentColorLight,
      headerFontSize: configs.headerFontSize,
      headerFontWeight: configs.headerFontWeight,
    };

    const headerBg = isDark
      ? configs.headerBackgroundColorDark
      : configs.headerBackgroundColorLight;
    if (headerBg) params.headerBackgroundColor = headerBg;

    return base.withParams(params);
  });
}
