import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { EditorTheme } from '~/components/base/code-editor/constants';
import { useVueJsonPrettyTheme } from '~/core/composables/useVueJsonPrettyTheme';
import { useAppConfigStore } from '~/core/stores/appConfigStore';

describe('useVueJsonPrettyTheme', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('reactively updates themeMode and themeClass when store theme changes to Dracula', () => {
    const store = useAppConfigStore();
    const { resolvedTheme, isDark, themeMode, themeClass } =
      useVueJsonPrettyTheme();

    store.codeEditorConfigs.theme = EditorTheme.Dracula;

    expect(resolvedTheme.value).toBe(EditorTheme.Dracula);
    expect(isDark.value).toBe(true);
    expect(themeMode.value).toBe('dark');
    expect(themeClass.value).toBe('orca-json-pretty vjs-theme-dracula');
  });

  it('reactively updates themeMode and themeClass when store theme changes to Barf', () => {
    const store = useAppConfigStore();
    const { resolvedTheme, isDark, themeMode, themeClass } =
      useVueJsonPrettyTheme();

    store.codeEditorConfigs.theme = EditorTheme.Barf;

    expect(resolvedTheme.value).toBe(EditorTheme.Barf);
    expect(isDark.value).toBe(true);
    expect(themeMode.value).toBe('dark');
    expect(themeClass.value).toBe('orca-json-pretty vjs-theme-barf');
  });

  it('reactively updates themeMode and themeClass when store theme changes to AyuLight', () => {
    const store = useAppConfigStore();
    const { resolvedTheme, isDark, themeMode, themeClass } =
      useVueJsonPrettyTheme();

    store.codeEditorConfigs.theme = EditorTheme.AyuLight;

    expect(resolvedTheme.value).toBe(EditorTheme.AyuLight);
    expect(isDark.value).toBe(false);
    expect(themeMode.value).toBe('light');
    expect(themeClass.value).toBe('orca-json-pretty vjs-theme-ayu-light');
  });

  it('reactively updates themeMode and themeClass when store theme changes to NoctisLilac', () => {
    const store = useAppConfigStore();
    const { resolvedTheme, isDark, themeMode, themeClass } =
      useVueJsonPrettyTheme();

    store.codeEditorConfigs.theme = EditorTheme.NoctisLilac;

    expect(resolvedTheme.value).toBe(EditorTheme.NoctisLilac);
    expect(isDark.value).toBe(false);
    expect(themeMode.value).toBe('light');
    expect(themeClass.value).toBe('orca-json-pretty vjs-theme-noctis-lilac');
  });

  it('reactively updates fontSize and themeStyle when editor fontSize changes', () => {
    const store = useAppConfigStore();
    const { fontSize, themeStyle } = useVueJsonPrettyTheme();

    expect(fontSize.value).toBe(10);
    expect(themeStyle.value).toEqual({ fontSize: '10pt' });

    store.codeEditorConfigs.fontSize = 14;

    expect(fontSize.value).toBe(14);
    expect(themeStyle.value).toEqual({ fontSize: '14pt' });
  });
});
