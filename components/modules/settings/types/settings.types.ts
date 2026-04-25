import type { EditorTheme } from '~/components/base/code-editor/constants';

export enum SettingsComponentKey {
  DesktopConfig = 'DesktopConfig',
  EditorConfig = 'EditorConfig',
  QuickQueryConfig = 'QuickQueryConfig',
  AgentConfig = 'AgentConfig',
  AppearanceConfig = 'AppearanceConfig',
  TableAppearanceConfig = 'TableAppearanceConfig',
  BackupRestoreConfig = 'BackupRestoreConfig',
  EnvironmentTagsConfig = 'EnvironmentTagsConfig',
}

export type SettingsNavItem = {
  name: string;
  icon: string;
  componentKey?: SettingsComponentKey;
  disable?: boolean;
  desktopOnly?: boolean;
};

export enum ThinkingStyle {
  Shimmer = 'shimmer',
  Scramble = 'scramble',
}

export interface CodeEditorConfigs {
  theme: EditorTheme;
  fontSize: number;
  showMiniMap: boolean;
  indentation: boolean;
}

export interface ChatUiConfigs {
  fontSize: number;
  codeFontSize: number;
  thinkingStyle: ThinkingStyle;
}

export interface CustomLayoutSizeEntry {
  panels: number[];
  innerPanels: number[];
}

export enum AIProvider {
  OpenAI = 'openai',
  Google = 'google',
  Anthropic = 'anthropic',
  XAI = 'xai',
  OpenRouter = 'openrouter',
}

export interface AgentApiKeyConfigs {
  openai: string;
  google: string;
  anthropic: string;
  xai: string;
  openrouter: string;
}

export enum NullOrderPreference {
  Unset = 'unset',
  NullsFirst = 'nulls-first',
  NullsLast = 'nulls-last',
}

export interface TableAppearanceConfigs {
  // Row
  fontSize: number;
  rowHeight: number;
  cellSpacing: number;
  nullOrderPreference: NullOrderPreference;
  accentColorLight: string;
  accentColorDark: string;
  // Header
  headerFontSize: number;
  headerFontWeight: number;
  headerBackgroundColorLight: string;
  headerBackgroundColorDark: string;
}

export enum SpaceDisplay {
  Compact = 'compact',
  Default = 'default',
  Spacious = 'spacious',
}
