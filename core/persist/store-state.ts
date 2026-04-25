/**
 * store-state.ts — backward-compat re-export layer.
 *
 * All normalize logic now lives in ./normalize.ts (zero browser deps).
 * This file re-exports everything for backward compat with the many
 * files that import from '~/core/persist/store-state', and adds the
 * legacy storage key constants that are specific to the web renderer.
 */

// Re-export all shared normalize exports for backward compat.
export {
  APP_CONFIG_PERSIST_ID,
  AGENT_STATE_PERSIST_ID,
  AIProvider,
  SpaceDisplay,
  EditorTheme,
  RawQueryEditorLayout,
  ThinkingStyle,
  createDefaultAppConfigState,
  normalizeAppConfigState,
  createDefaultAgentState,
  normalizeAgentState,
} from './normalize';

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
} from './normalize';

// ── Web-renderer-only constants ───────────────────────────────────────────────
// These are NOT in normalize.ts — they reference localStorage keys used by
// the legacy migration system and are meaningless in the Electron main process.

export const LEGACY_APP_CONFIG_STORAGE_KEY = 'app-config-store';

export const LEGACY_AGENT_STORAGE_KEYS = {
  selectedNodeId: 'heraq-agent-selected-node',
  draftShowReasoning: 'heraq-agent-draft-show-reasoning',
  activeHistoryId: 'heraq-agent-active-history',
  showAttachmentPanel: 'heraq-agent-attachment-panel-open',
  histories: 'heraq-agent-chat-history',
} as const;
