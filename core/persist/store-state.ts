import { DEFAULT_EDITOR_CONFIG } from '~/components/base/code-editor/constants';
import type { AgentHistorySession } from '~/components/modules/agent/types';
import {
  hasIncompleteDbAgentMessages,
  sanitizeDbAgentMessages,
} from '~/components/modules/agent/utils/sanitizeDbAgentMessages';
import {
  RawQueryEditorDefaultSize,
  RawQueryEditorLayout,
  type CustomLayoutDefinition,
} from '~/components/modules/raw-query/constants';
import {
  DEFAULT_CHAT_UI_CONFIG,
  DEFAULT_TABLE_APPEARANCE_CONFIGS,
} from '~/components/modules/settings/constants';
import {
  AIProvider,
  SpaceDisplay,
  type AgentApiKeyConfigs,
  type ChatUiConfigs,
  type CodeEditorConfigs,
  type CustomLayoutSizeEntry,
  type TableAppearanceConfigs,
} from '~/components/modules/settings/types';

export const APP_CONFIG_PERSIST_ID = 'app-config';
export const AGENT_STATE_PERSIST_ID = 'agent-state';

export const LEGACY_APP_CONFIG_STORAGE_KEY = 'app-config-store';

export const LEGACY_AGENT_STORAGE_KEYS = {
  selectedNodeId: 'heraq-agent-selected-node',
  draftShowReasoning: 'heraq-agent-draft-show-reasoning',
  activeHistoryId: 'heraq-agent-active-history',
  showAttachmentPanel: 'heraq-agent-attachment-panel-open',
  histories: 'heraq-agent-chat-history',
} as const;

const DEFAULT_APP_LAYOUT_SIZE = [30, 70, 0] as number[];
const DEFAULT_BODY_LAYOUT_SIZE = [100, 0] as number[];
const DEFAULT_EDITOR_LAYOUT_SIZES: [number, number] = [
  RawQueryEditorDefaultSize.content,
  RawQueryEditorDefaultSize.result,
];
const DEFAULT_EDITOR_INNER_VARIABLE_SIZES: [number, number] = [
  RawQueryEditorDefaultSize.content,
  RawQueryEditorDefaultSize.variables,
];

const SECTION_NODE_IDS = {
  history: 'agent-section-history',
} as const;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const getLastPreview = (messages: AgentHistorySession['messages']): string => {
  const lastText = [...messages]
    .reverse()
    .flatMap(message =>
      (message.parts || [])
        .filter(
          (part): part is { type: 'text'; text: string } => part.type === 'text'
        )
        .map(part => part.text)
    )
    .find(Boolean);

  return (lastText || '').replace(/\s+/g, ' ').trim();
};

const sanitizeHistorySession = (
  history: AgentHistorySession
): AgentHistorySession => {
  const sanitizedMessages = sanitizeDbAgentMessages(history.messages);

  if (!hasIncompleteDbAgentMessages(history.messages)) {
    return clone(history);
  }

  return {
    ...clone(history),
    preview: getLastPreview(sanitizedMessages).slice(0, 140),
    messages: clone(sanitizedMessages),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeNumberArray = (value: unknown, fallback: number[]): number[] => {
  if (!Array.isArray(value)) return [...fallback];

  const normalized = value
    .map(item =>
      typeof item === 'number' && Number.isFinite(item) ? item : null
    )
    .filter((item): item is number => item !== null);

  return normalized.length === fallback.length ? normalized : [...fallback];
};

const normalizeFlexibleNumberArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is number => typeof item === 'number' && Number.isFinite(item)
  );
};

const normalizeTuple = (
  value: unknown,
  fallback: [number, number]
): [number, number] => {
  const normalized = normalizeNumberArray(value, fallback);
  return [normalized[0]!, normalized[1]!];
};

function normalizeObject<T extends object>(value: unknown, fallback: T): T {
  if (!isRecord(value)) return clone(fallback);
  return {
    ...clone(fallback),
    ...(value as object),
  } as T;
}

export interface AppConfigPersistedState {
  id: string;
  layoutSize: number[];
  historyLayoutSize: number[];
  bodySize: number[];
  historyBodySize: number[];
  codeEditorLayout: RawQueryEditorLayout;
  editorLayoutSizes: [number, number];
  editorLayoutInnerVariableSizes: [number, number];
  codeEditorConfigs: CodeEditorConfigs;
  chatUiConfigs: ChatUiConfigs;
  agentApiKeyConfigs: AgentApiKeyConfigs;
  agentSelectedProvider: AIProvider;
  agentSelectedModel: string;
  quickQuerySafeModeEnabled: boolean;
  spaceDisplay: SpaceDisplay;
  tableAppearanceConfigs: TableAppearanceConfigs;
  customLayouts: CustomLayoutDefinition[];
  activeCustomLayoutId: string | null;
  customLayoutSizes: Record<string, CustomLayoutSizeEntry>;
}

export interface AgentPersistedState {
  id: string;
  selectedNodeId: string;
  draftShowReasoning: boolean;
  activeHistoryId: string | null;
  showAttachmentPanel: boolean;
  histories: AgentHistorySession[];
}

export const createDefaultAppConfigState = (): AppConfigPersistedState => ({
  id: APP_CONFIG_PERSIST_ID,
  layoutSize: [...DEFAULT_APP_LAYOUT_SIZE],
  historyLayoutSize: [...DEFAULT_APP_LAYOUT_SIZE],
  bodySize: [...DEFAULT_BODY_LAYOUT_SIZE],
  historyBodySize: [...DEFAULT_BODY_LAYOUT_SIZE],
  codeEditorLayout: RawQueryEditorLayout.vertical,
  editorLayoutSizes: [...DEFAULT_EDITOR_LAYOUT_SIZES],
  editorLayoutInnerVariableSizes: [...DEFAULT_EDITOR_INNER_VARIABLE_SIZES],
  codeEditorConfigs: {
    fontSize: DEFAULT_EDITOR_CONFIG.fontSize,
    showMiniMap: DEFAULT_EDITOR_CONFIG.showMiniMap,
    theme: DEFAULT_EDITOR_CONFIG.theme,
    indentation: DEFAULT_EDITOR_CONFIG.indentation,
  },
  chatUiConfigs: {
    fontSize: DEFAULT_CHAT_UI_CONFIG.fontSize,
    codeFontSize: DEFAULT_CHAT_UI_CONFIG.codeFontSize,
    thinkingStyle: DEFAULT_CHAT_UI_CONFIG.thinkingStyle,
  },
  agentApiKeyConfigs: {
    openai: '',
    google: '',
    anthropic: '',
    xai: '',
    openrouter: '',
  },
  agentSelectedProvider: AIProvider.Google,
  agentSelectedModel: 'gemini-2.5-flash',
  quickQuerySafeModeEnabled: false,
  spaceDisplay: SpaceDisplay.Default,
  tableAppearanceConfigs: {
    ...DEFAULT_TABLE_APPEARANCE_CONFIGS,
  },
  customLayouts: [],
  activeCustomLayoutId: null,
  customLayoutSizes: {},
});

export const normalizeAppConfigState = (
  value: unknown
): AppConfigPersistedState => {
  const fallback = createDefaultAppConfigState();
  const source = isRecord(value) ? value : {};

  const layout = Object.values(RawQueryEditorLayout).includes(
    source.codeEditorLayout as RawQueryEditorLayout
  )
    ? (source.codeEditorLayout as RawQueryEditorLayout)
    : fallback.codeEditorLayout;

  const provider = Object.values(AIProvider).includes(
    source.agentSelectedProvider as AIProvider
  )
    ? (source.agentSelectedProvider as AIProvider)
    : fallback.agentSelectedProvider;

  const spaceDisplay = Object.values(SpaceDisplay).includes(
    source.spaceDisplay as SpaceDisplay
  )
    ? (source.spaceDisplay as SpaceDisplay)
    : fallback.spaceDisplay;

  const customLayoutSizes = isRecord(source.customLayoutSizes)
    ? Object.fromEntries(
        Object.entries(source.customLayoutSizes).flatMap(([key, entry]) => {
          if (!isRecord(entry)) return [];

          return [
            [
              key,
              {
                panels: normalizeFlexibleNumberArray(entry.panels),
                innerPanels: normalizeFlexibleNumberArray(entry.innerPanels),
              } satisfies CustomLayoutSizeEntry,
            ],
          ];
        })
      )
    : {};

  return {
    id:
      typeof source.id === 'string' && source.id.length > 0
        ? source.id
        : fallback.id,
    layoutSize: normalizeNumberArray(source.layoutSize, fallback.layoutSize),
    historyLayoutSize: normalizeNumberArray(
      source.historyLayoutSize,
      fallback.historyLayoutSize
    ),
    bodySize: normalizeNumberArray(source.bodySize, fallback.bodySize),
    historyBodySize: normalizeNumberArray(
      source.historyBodySize,
      fallback.historyBodySize
    ),
    codeEditorLayout: layout,
    editorLayoutSizes: normalizeTuple(
      source.editorLayoutSizes,
      fallback.editorLayoutSizes
    ),
    editorLayoutInnerVariableSizes: normalizeTuple(
      source.editorLayoutInnerVariableSizes,
      fallback.editorLayoutInnerVariableSizes
    ),
    codeEditorConfigs: normalizeObject(
      source.codeEditorConfigs,
      fallback.codeEditorConfigs
    ),
    chatUiConfigs: normalizeObject(
      source.chatUiConfigs,
      fallback.chatUiConfigs
    ),
    agentApiKeyConfigs: normalizeObject(
      source.agentApiKeyConfigs,
      fallback.agentApiKeyConfigs
    ),
    agentSelectedProvider: provider,
    agentSelectedModel:
      typeof source.agentSelectedModel === 'string'
        ? source.agentSelectedModel
        : fallback.agentSelectedModel,
    quickQuerySafeModeEnabled:
      typeof source.quickQuerySafeModeEnabled === 'boolean'
        ? source.quickQuerySafeModeEnabled
        : fallback.quickQuerySafeModeEnabled,
    spaceDisplay,
    tableAppearanceConfigs: normalizeObject(
      source.tableAppearanceConfigs,
      fallback.tableAppearanceConfigs
    ),
    customLayouts: Array.isArray(source.customLayouts)
      ? clone(source.customLayouts as CustomLayoutDefinition[])
      : fallback.customLayouts,
    activeCustomLayoutId:
      typeof source.activeCustomLayoutId === 'string' ||
      source.activeCustomLayoutId === null
        ? source.activeCustomLayoutId
        : fallback.activeCustomLayoutId,
    customLayoutSizes,
  };
};

export const createDefaultAgentState = (): AgentPersistedState => ({
  id: AGENT_STATE_PERSIST_ID,
  selectedNodeId: SECTION_NODE_IDS.history,
  draftShowReasoning: true,
  activeHistoryId: null,
  showAttachmentPanel: false,
  histories: [],
});

export const normalizeAgentState = (value: unknown): AgentPersistedState => {
  const fallback = createDefaultAgentState();
  const source = isRecord(value) ? value : {};

  return {
    id:
      typeof source.id === 'string' && source.id.length > 0
        ? source.id
        : fallback.id,
    selectedNodeId:
      typeof source.selectedNodeId === 'string'
        ? source.selectedNodeId
        : fallback.selectedNodeId,
    draftShowReasoning:
      typeof source.draftShowReasoning === 'boolean'
        ? source.draftShowReasoning
        : fallback.draftShowReasoning,
    activeHistoryId:
      typeof source.activeHistoryId === 'string' ||
      source.activeHistoryId === null
        ? source.activeHistoryId
        : fallback.activeHistoryId,
    showAttachmentPanel:
      typeof source.showAttachmentPanel === 'boolean'
        ? source.showAttachmentPanel
        : fallback.showAttachmentPanel,
    histories: Array.isArray(source.histories)
      ? source.histories.map(history =>
          sanitizeHistorySession(history as AgentHistorySession)
        )
      : fallback.histories,
  };
};
