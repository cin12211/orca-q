import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  useAppLayoutStore,
  DEFAULT_TABLE_APPEARANCE_CONFIGS,
} from '~/core/stores/appLayoutStore';

describe('appLayoutStore — tableAppearanceConfigs', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initializes with DEFAULT_TABLE_APPEARANCE_CONFIGS defaults', () => {
    const store = useAppLayoutStore();
    expect(store.tableAppearanceConfigs.fontSize).toBe(
      DEFAULT_TABLE_APPEARANCE_CONFIGS.fontSize
    );

    expect(store.tableAppearanceConfigs.accentColorLight).toBe(
      DEFAULT_TABLE_APPEARANCE_CONFIGS.accentColorLight
    );
    expect(store.tableAppearanceConfigs.accentColorDark).toBe(
      DEFAULT_TABLE_APPEARANCE_CONFIGS.accentColorDark
    );
  });

  it('allows fontSize to be mutated independently', () => {
    const store = useAppLayoutStore();
    store.tableAppearanceConfigs.fontSize = 16;
    expect(store.tableAppearanceConfigs.fontSize).toBe(16);
  });

  it('allows accentColorLight to be mutated without affecting accentColorDark', () => {
    const store = useAppLayoutStore();
    store.tableAppearanceConfigs.accentColorLight = '#ff0000';
    expect(store.tableAppearanceConfigs.accentColorLight).toBe('#ff0000');
    expect(store.tableAppearanceConfigs.accentColorDark).toBe(
      DEFAULT_TABLE_APPEARANCE_CONFIGS.accentColorDark
    );
  });

  it('allows accentColorDark to be mutated without affecting accentColorLight', () => {
    const store = useAppLayoutStore();
    store.tableAppearanceConfigs.accentColorDark = '#00ff00';
    expect(store.tableAppearanceConfigs.accentColorDark).toBe('#00ff00');
    expect(store.tableAppearanceConfigs.accentColorLight).toBe(
      DEFAULT_TABLE_APPEARANCE_CONFIGS.accentColorLight
    );
  });

  it('resetTableAppearance() restores all fields to defaults', () => {
    const store = useAppLayoutStore();

    store.tableAppearanceConfigs.fontSize = 20;
    store.tableAppearanceConfigs.accentColorLight = '#ff0000';
    store.tableAppearanceConfigs.accentColorDark = '#00ff00';

    store.resetTableAppearance();

    expect(store.tableAppearanceConfigs.fontSize).toBe(
      DEFAULT_TABLE_APPEARANCE_CONFIGS.fontSize
    );

    expect(store.tableAppearanceConfigs.accentColorLight).toBe(
      DEFAULT_TABLE_APPEARANCE_CONFIGS.accentColorLight
    );
    expect(store.tableAppearanceConfigs.accentColorDark).toBe(
      DEFAULT_TABLE_APPEARANCE_CONFIGS.accentColorDark
    );
  });

  it('DEFAULT_TABLE_APPEARANCE_CONFIGS has all required shape keys', () => {
    const keys = [
      'fontSize',
      'spacingPreset',
      'accentColorLight',
      'accentColorDark',
    ] as const;
    for (const key of keys) {
      expect(DEFAULT_TABLE_APPEARANCE_CONFIGS).toHaveProperty(key);
    }
  });
});
