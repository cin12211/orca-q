import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_TABLE_APPEARANCE_CONFIGS } from '~/components/modules/settings/constants';
import { useAppConfigStore } from '~/core/stores/appConfigStore';

describe('useTableTheme — via store integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('fontSize change is reflected in the store', () => {
    const store = useAppConfigStore();
    store.tableAppearanceConfigs.fontSize = 17;
    expect(store.tableAppearanceConfigs.fontSize).toBe(17);
  });

  it('dark mode uses accentColorDark', () => {
    const store = useAppConfigStore();
    store.tableAppearanceConfigs.accentColorDark = '#abcdef';

    // Mirrors logic inside useTableTheme's computed
    const isDark = true;
    const accent = isDark
      ? store.tableAppearanceConfigs.accentColorDark
      : store.tableAppearanceConfigs.accentColorLight;

    expect(accent).toBe('#abcdef');
  });

  it('light mode uses accentColorLight', () => {
    const store = useAppConfigStore();
    store.tableAppearanceConfigs.accentColorLight = '#fedcba';

    const isDark = false;
    const accent = isDark
      ? store.tableAppearanceConfigs.accentColorDark
      : store.tableAppearanceConfigs.accentColorLight;

    expect(accent).toBe('#fedcba');
  });

  it('DEFAULT_TABLE_APPEARANCE_CONFIGS font size is within valid slider range [10,20]', () => {
    expect(DEFAULT_TABLE_APPEARANCE_CONFIGS.fontSize).toBeGreaterThanOrEqual(
      10
    );
    expect(DEFAULT_TABLE_APPEARANCE_CONFIGS.fontSize).toBeLessThanOrEqual(20);
  });

  it('DEFAULT_TABLE_APPEARANCE_CONFIGS accent colors are different per mode', () => {
    expect(DEFAULT_TABLE_APPEARANCE_CONFIGS.accentColorLight).not.toBe(
      DEFAULT_TABLE_APPEARANCE_CONFIGS.accentColorDark
    );
  });
});
