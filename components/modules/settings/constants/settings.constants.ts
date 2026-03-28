import {
  ThinkingStyle,
  SettingsComponentKey,
  type SettingsNavItem,
  type TableAppearanceConfigs,
  type ChatUiConfigs,
} from '../types';

export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  {
    name: 'Desktop',
    icon: 'lucide:download',
    componentKey: SettingsComponentKey.DesktopConfig,
  },
  {
    name: 'Appearance',
    icon: 'hugeicons:paint-brush-02',
    componentKey: SettingsComponentKey.AppearanceConfig,
  },
  {
    name: 'Editor',
    icon: 'hugeicons:scroll',
    componentKey: SettingsComponentKey.EditorConfig,
  },
  {
    name: 'Quick Query',
    icon: 'hugeicons:grid-table',
    componentKey: SettingsComponentKey.QuickQueryConfig,
  },
  {
    name: 'Agent',
    icon: 'hugeicons:chat-bot',
    componentKey: SettingsComponentKey.AgentConfig,
  },
  { name: 'Language & region', icon: 'hugeicons:globe', disable: true },
  { name: 'Privacy & visibility', icon: 'hugeicons:lock', disable: true },
  { name: 'Advanced', icon: 'hugeicons:settings-01', disable: true },
];

export const TABLE_ROW_HEIGHT_RANGE = {
  min: 20,
  max: 60,
  step: 1,
  default: 32,
};

export const TABLE_FONT_SIZE_OPTIONS: Array<{ label: string; value: number }> =
  [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(n => ({
    label: `${n}px`,
    value: n,
  }));

export const TABLE_HEADER_FONT_SIZE_OPTIONS: Array<{
  label: string;
  value: number;
}> = [10, 11, 12, 13, 14, 15, 16, 17, 18].map(n => ({
  label: `${n}px`,
  value: n,
}));

export const HEADER_FONT_WEIGHT_OPTIONS: Array<{
  label: string;
  value: number;
}> = [
  { label: 'Normal', value: 400 },
  { label: 'Medium', value: 500 },
  { label: 'Semi Bold', value: 600 },
  { label: 'Bold', value: 700 },
  { label: 'Extra Bold', value: 800 },
  { label: 'Black', value: 900 },
];

export const CHAT_FONT_SIZES = [10, 11, 12, 13, 14, 15, 16];
export const CHAT_CODE_FONT_SIZES = [10, 11, 12, 13, 14, 15, 16];

export const THEME_MODE_OPTIONS = [
  { label: 'Light', value: 'light', icon: 'lucide:sun' },
  { label: 'Dark', value: 'dark', icon: 'lucide:moon' },
  { label: 'System', value: 'system', icon: 'lucide:monitor' },
] as const;

export type ThemeMode = (typeof THEME_MODE_OPTIONS)[number]['value'];

export const DEFAULT_TABLE_APPEARANCE_CONFIGS: TableAppearanceConfigs = {
  fontSize: 12,
  rowHeight: 25,
  cellSpacing: 2.8,
  accentColorLight: '#2196F3',
  accentColorDark: '#2196F3',
  headerFontSize: 12,
  headerFontWeight: 700,
  headerBackgroundColorLight: '',
  headerBackgroundColorDark: '',
};

export const DEFAULT_CHAT_UI_CONFIG: ChatUiConfigs = {
  fontSize: 12,
  codeFontSize: 12,
  thinkingStyle: ThinkingStyle.Shimmer,
};

export const THINKING_STYLE_OPTIONS: Array<{
  label: string;
  value: ThinkingStyle;
}> = [
  {
    label: 'Shimmer',
    value: ThinkingStyle.Shimmer,
  },
  {
    label: 'Scramble',
    value: ThinkingStyle.Scramble,
  },
];

export const SPACE_DISPLAY_OPTIONS = [
  { label: 'Compact', value: 'compact', icon: '' },
  { label: 'Default', value: 'default', icon: '' },
  { label: 'Spacious', value: 'spacious', icon: '' },
] as const;

export const DEFAULT_SPACE_DISPLAY = 'default' as const;
