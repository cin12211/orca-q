import { computed } from 'vue';
import {
  DEFAULT_EDITOR_CONFIG,
  EditorTheme,
  EditorThemeDark,
  resolveEditorTheme,
} from '~/components/base/code-editor/constants';
import { useAppConfigStore } from '~/core/stores/appConfigStore';

/**
 * Composable that synchronizes VueJsonPretty theme with user Code Editor settings.
 *
 * Reads `appConfigStore.codeEditorConfigs.theme` and `colorMode.value`,
 * resolving automatic light/dark switching (e.g. tomorrow / orca-dark defaults)
 * to output the corresponding themeMode ('dark' | 'light') and themeClass ('vjs-theme-*').
 */
export function useVueJsonPrettyTheme() {
  const appConfigStore = useAppConfigStore();
  const colorMode = useColorMode();

  const resolvedTheme = computed<EditorTheme>(() => {
    const configuredTheme =
      appConfigStore.codeEditorConfigs?.theme || DEFAULT_EDITOR_CONFIG.theme;
    return resolveEditorTheme(configuredTheme, colorMode.value);
  });

  const isDark = computed<boolean>(() => {
    return EditorThemeDark.includes(resolvedTheme.value);
  });

  const themeMode = computed<'dark' | 'light'>(() => {
    return isDark.value ? 'dark' : 'light';
  });

  const themeClass = computed<string>(() => {
    return `orca-json-pretty vjs-theme-${resolvedTheme.value}`;
  });

  return {
    resolvedTheme,
    isDark,
    themeMode,
    themeClass,
  };
}
