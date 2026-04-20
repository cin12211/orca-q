/**
 * Re-export from the shared normalize module.
 *
 * All normalize logic lives in core/persist/normalize.ts (zero browser deps).
 * This file is the Electron-side entry point — electron/persist/entities/ files
 * import from here so their import path stays within electron/persist/.
 *
 * core/persist/normalize.ts compiles cleanly from electron/tsconfig.json
 * because it has ZERO imports from ~/components/ or any browser-bundled module.
 */
export {
  APP_CONFIG_PERSIST_ID,
  AGENT_STATE_PERSIST_ID,
  EditorTheme,
  RawQueryEditorLayout,
  ThinkingStyle,
  AIProvider,
  SpaceDisplay,
  createDefaultAppConfigState,
  normalizeAppConfigState,
  createDefaultAgentState,
  normalizeAgentState,
} from '../../../core/persist/normalize';

export type {
  AppConfigPersistedState,
  AgentPersistedState,
  AgentHistorySession,
  CodeEditorConfigs,
  ChatUiConfigs,
  AgentApiKeyConfigs,
  TableAppearanceConfigs,
  CustomLayoutSizeEntry,
  CustomLayoutDefinition,
} from '../../../core/persist/normalize';
