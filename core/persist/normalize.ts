/**
 * Single source of truth for AppConfig / AgentState normalize logic.
 *
 * ZERO browser-specific imports — this file compiles in both the Nuxt
 * renderer context AND the Electron main process (electron/tsconfig.json).
 *
 * Consumers:
 *  - core/persist/store-state.ts  (web renderer — imports & re-exports)
 *  - electron/persist/utils/normalizeState.ts  (Electron main — thin re-export)
 *
 * ALL enums, interfaces, default constants, helpers, and normalize functions
 * are defined here. Do NOT import from ~/components/ or ~/core/stores/ —
 * those pull in browser-bundled code that crashes the Electron main process.
 */

// ── Enums ─────────────────────────────────────────────────────────────────────

export enum EditorTheme {
  AyuLight = 'ayu-light',
  AyuDark = 'ayu-dark',
  AyuMirage = 'ayu-mirage',
  NoctisLilac = 'noctis-lilac',
  RosePineDawn = 'rose-pine-dawn',
  Tomorrow = 'tomorrow',
  OrcaLight = 'orca-light',
  Barf = 'barf',
  Bespin = 'bespin',
  Dracula = 'dracula',
  OrcaDark = 'orca-dark',
}

export enum RawQueryEditorLayout {
  horizontal = 'horizontal',
  horizontalWithVariables = 'horizontalWithVariables',
  vertical = 'vertical',
}

export enum ThinkingStyle {
  Shimmer = 'shimmer',
  Scramble = 'scramble',
}

export enum AIProvider {
  OpenAI = 'openai',
  Google = 'google',
  Anthropic = 'anthropic',
  XAI = 'xai',
  OpenRouter = 'openrouter',
}

export enum SpaceDisplay {
  Compact = 'compact',
  Default = 'default',
  Spacious = 'spacious',
}

export enum NullOrderPreference {
  Unset = 'unset',
  NullsFirst = 'nulls-first',
  NullsLast = 'nulls-last',
}

// ── Shared interfaces ─────────────────────────────────────────────────────────

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

export interface AgentApiKeyConfigs {
  openai: string;
  google: string;
  anthropic: string;
  xai: string;
  openrouter: string;
}

export interface TableAppearanceConfigs {
  fontSize: number;
  rowHeight: number;
  cellSpacing: number;
  nullOrderPreference: NullOrderPreference;
  accentColorLight: string;
  accentColorDark: string;
  headerFontSize: number;
  headerFontWeight: number;
  headerBackgroundColorLight: string;
  headerBackgroundColorDark: string;
}

export interface CustomLayoutSizeEntry {
  panels: number[];
  innerPanels: number[];
}

export interface CustomLayoutDefinition {
  id: string;
  name: string;
  direction: string;
  panels: unknown[];
  innerSplit?: unknown;
  createdAt: number;
}

/**
 * Loose-typed — avoids importing AI SDK message types that are
 * browser-bundled. Structurally compatible with the stricter
 * AgentHistorySession type in components/modules/agent/types/.
 */
export interface AgentHistorySession {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  provider: string;
  model: string;
  showReasoning: boolean;
  messages: Record<string, unknown>[];
  workspaceId?: string;
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

// ── Well-known persist IDs ────────────────────────────────────────────────────

export const APP_CONFIG_PERSIST_ID = 'app-config';
export const AGENT_STATE_PERSIST_ID = 'agent-state';

// ── Default constants (private) ───────────────────────────────────────────────

const RawQueryEditorDefaultSize = {
  content: 70,
  variables: 30,
  result: 30,
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

const DEFAULT_EDITOR_CONFIG = {
  fontSize: 10,
  showMiniMap: false,
  indentation: false,
  theme: EditorTheme.Tomorrow,
};

const DEFAULT_CHAT_UI_CONFIG = {
  fontSize: 12,
  codeFontSize: 12,
  thinkingStyle: ThinkingStyle.Shimmer,
};

const DEFAULT_TABLE_APPEARANCE_CONFIGS = {
  fontSize: 12,
  rowHeight: 25,
  cellSpacing: 2.8,
  nullOrderPreference: NullOrderPreference.Unset,
  accentColorLight: '#2196F3',
  accentColorDark: '#2196F3',
  headerFontSize: 12,
  headerFontWeight: 700,
  headerBackgroundColorLight: '',
  headerBackgroundColorDark: '',
};

// ── Pure helpers (private) ────────────────────────────────────────────────────

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

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
  return { ...clone(fallback), ...(value as object) } as T;
}

// ── Agent message sanitisation helpers (private) ──────────────────────────────

type AnyMessage = Record<string, unknown>;
type AnyMessagePart = Record<string, unknown>;

const STABLE_TOOL_PART_STATES = new Set([
  'approval-requested',
  'output-available',
  'output-error',
]);

const isToolPart = (part: AnyMessagePart) =>
  typeof part.type === 'string' && (part.type as string).startsWith('tool-');

const isIncompleteToolPart = (part: AnyMessagePart) => {
  if (!isToolPart(part)) return false;
  const partState = 'state' in part ? String(part.state || '') : '';
  return !STABLE_TOOL_PART_STATES.has(partState);
};

const sanitizeDbAgentMessages = (messages: AnyMessage[]): AnyMessage[] => {
  const sanitizedMessages: AnyMessage[] = [];
  let shouldDropRemainingMessages = false;

  for (const message of messages) {
    if (shouldDropRemainingMessages) break;

    if (message.role !== 'assistant' || !Array.isArray(message.parts)) {
      sanitizedMessages.push(message);
      continue;
    }

    const stableParts: AnyMessagePart[] = [];
    for (const part of message.parts as AnyMessagePart[]) {
      if (isIncompleteToolPart(part)) {
        shouldDropRemainingMessages = true;
        break;
      }
      stableParts.push(part);
    }

    if (stableParts.length > 0) {
      sanitizedMessages.push({ ...message, parts: stableParts });
    }
  }

  return sanitizedMessages;
};

const hasIncompleteDbAgentMessages = (messages: AnyMessage[]) => {
  const sanitized = sanitizeDbAgentMessages(messages);
  return JSON.stringify(sanitized) !== JSON.stringify(messages);
};

const getLastPreview = (messages: AnyMessage[]): string => {
  const lastText = [...messages]
    .reverse()
    .flatMap(message =>
      (Array.isArray(message.parts) ? (message.parts as AnyMessagePart[]) : [])
        .filter(
          (part): part is AnyMessagePart & { text: string } =>
            part.type === 'text' && typeof part.text === 'string'
        )
        .map(part => part.text)
    )
    .find(Boolean);

  return (lastText || '').replace(/\s+/g, ' ').trim();
};

const sanitizeHistorySession = (
  history: AgentHistorySession
): AgentHistorySession => {
  const msgs = history.messages as AnyMessage[];
  const sanitizedMessages = sanitizeDbAgentMessages(msgs);

  if (!hasIncompleteDbAgentMessages(msgs)) {
    return clone(history);
  }

  return {
    ...clone(history),
    preview: getLastPreview(sanitizedMessages).slice(0, 140),
    messages: clone(sanitizedMessages) as AgentHistorySession['messages'],
  };
};

// ── Exported factory + normalize functions ────────────────────────────────────

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
  tableAppearanceConfigs: { ...DEFAULT_TABLE_APPEARANCE_CONFIGS },
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
  selectedNodeId: 'agent-section-history',
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
      ? (source.histories as AgentHistorySession[]).map(history =>
          sanitizeHistorySession(history)
        )
      : fallback.histories,
  };
};
