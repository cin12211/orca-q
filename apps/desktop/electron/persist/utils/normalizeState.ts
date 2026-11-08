/**
 * Re-export from the shared normalize module.
 *
 * All normalize logic lives in apps/web/shared/persist/normalize.ts (zero browser deps).
 * It must stay a relative import: tsc does not rewrite `~/` aliases, and the
 * compiled out/desktop/electron/** requires out/web/shared/** at runtime.
 * This file is the Electron-side entry point — electron/persist/entities/ files
 * import from here so their import path stays within electron/persist/.
 *
 * shared/persist/normalize.ts compiles cleanly from electron/tsconfig.json
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
  normalizeMcpSession,
} from '../../../../web/shared/persist/normalize';

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
  McpSession,
} from '../../../../web/shared/persist/normalize';
