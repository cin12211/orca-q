export type SettingsComponentKey =
  | 'EditorConfig'
  | 'QuickQueryConfig'
  | 'AgentConfig'
  | 'AppearanceConfig'
  | 'TableAppearanceConfig';

export type SettingsNavItem = {
  name: string;
  icon: string;
  componentKey?: SettingsComponentKey;
  disable?: boolean;
};
