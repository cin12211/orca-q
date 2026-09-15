import type { Component } from 'vue';
import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { ContextMenuItem } from '~/components/base/context-menu/menuContext.type';
import type { DatabaseClientType } from '~/core/constants/database-client-type';
import type { Connection, RowQueryFile } from '~/core/stores';
import type { RawQueryEditorLayout } from '../constants';
import type { RawQueryEditor } from '../hooks/useRawQueryEditor';
import type {
  EditorCursor,
  ExecutedResultItem,
  ExplainAnalyzeOptionItem,
  ExplainAnalyzeSerializeMode,
  ExplainAnalyzeToggleOptionKey,
  MappedRawColumn,
  ViewMode,
} from '../interfaces';

export enum RawQueryResultExecutionPolicy {
  ALWAYS = 'always',
  SUCCESS_ONLY = 'success-only',
  ERROR_ONLY = 'error-only',
}

export interface RawQueryResultViewAvailability {
  enabled: boolean;
  reason?: string;
}

export interface RawQueryResultViewAvailabilityConfig {
  execution?: RawQueryResultExecutionPolicy;
  when?: (context: RawQueryContext) => RawQueryResultViewAvailability;
  disabledReason?: string;
}

export interface RawQueryResultViewDefinition {
  mode: ViewMode;
  label: string;
  renderer: Component;
  component?: Component;
  availability?: RawQueryResultViewAvailabilityConfig;
}

export type RawQueryResultTabDefinition = RawQueryResultViewDefinition;

export interface ResolvedRawQueryResultViewDefinition
  extends RawQueryResultViewDefinition {
  availabilityState: RawQueryResultViewAvailability;
}

export interface RawQueryResultConfig {
  views: readonly RawQueryResultViewDefinition[];
  tabs?: readonly RawQueryResultTabDefinition[];
}

export type RawQueryResultProfile = RawQueryResultConfig;

export interface RawQueryHeaderConfig {
  /**
   * Components rendered in the left cluster of the header (alongside breadcrumbs / title)
   * e.g. status pills, DB badges, collection indicators
   */
  leftComponents?: Component[];

  /**
   * Components rendered in the right cluster of the header (alongside selectors and actions)
   * e.g. custom database/replica selectors, extra toolbar buttons
   */
  rightComponents?: Component[];
}

export type RawQueryHeaderProfile = RawQueryHeaderConfig;

export interface RawQueryFooterConfig {
  /**
   * Components rendered in the left cluster of the footer (e.g. CursorInfo, GuidePopover)
   */
  leftComponents: Component[];

  /**
   * Action components rendered in the right cluster of the footer (e.g. FormatAction, ExplainAction, ExecuteAction)
   */
  rightComponents: Component[];
}

export type RawQueryFooterProfile = RawQueryFooterConfig;

/**
 * Master Context for Raw Query
 * Shared universally across Header, Footer, Result, and Plugin extension components.
 * Supports generic TDialectState to ensure 100% type-safe access to dialect-specific state.
 */
export interface RawQueryContext<TDialectState = any> {
  // Routing & Workspace
  workspaceId: string;

  // Connection info
  selectedConnectionId: string;
  connection?: Connection;
  connections: Connection[];
  disableConnectionSwitch: boolean;
  databaseType?: DatabaseClientType;

  // File info
  currentFileInfo?: RowQueryFile;
  currentFile?: RowQueryFile;
  fileContents: string;
  fileVariables: string;

  // Layout & UI
  codeEditorLayout: RawQueryEditorLayout;

  // Feature support flags
  isFormatSupported: boolean;
  isVariableSupported: boolean;
  isExplainSupported: boolean;

  // Editor instance
  rawQueryEditor?: RawQueryEditor;
  editor?: RawQueryEditor;

  // Execution & Cursor state
  cursorInfo: EditorCursor;
  executeLoading: boolean;
  isStreaming: boolean;
  isRawViewMode?: boolean;
  explainAnalyzeOptionItems?: ExplainAnalyzeOptionItem[];
  serializeMode?: ExplainAnalyzeSerializeMode;

  // Dialect registered reactive state with generic type support
  dialectState?: TDialectState;

  // Result tab & data properties
  activeTab?: ExecutedResultItem;
  activeResultTab?: ExecutedResultItem;
  activeTabColumns?: MappedRawColumn[];
  formattedData?: Record<string, any>[];
  changeView?: (view: ViewMode) => void;

  // Actions & Callbacks
  onUpdateConnectionId?: (connectionId: string) => void;
  onUpdateFileVariables?: (variables: string) => Promise<void> | void;
  onUpdateFileContent?: (value: string) => void;
  onFormatCurrentStatement?: () => void;
  onFormatAll?: () => void;
  onExplainAnalyzeCurrent?: () => void;
  toggleExplainOption?: (value: ExplainAnalyzeToggleOptionKey) => void;
  updateSerializeMode?: (value: ExplainAnalyzeSerializeMode) => void;
  onExecuteCurrent?: () => void;
  updateRawViewMode?: (value: boolean) => void;
  onCancelQuery?: () => void;
}

export type RawQueryResultViewContext<TDialectState = any> =
  RawQueryContext<TDialectState>;

export enum RawQueryContextMenuSection {
  EXECUTION = 'execution',
  ANALYSIS = 'analysis',
  FORMAT = 'format',
  TOOLS = 'tools',
  EDIT = 'edit',
}

export interface RawQueryExecutionResult {
  success: boolean;
  resultId?: string;
  error?: string | Error;
  data?: any;
}

export interface RawQueryExecutionContext<TDialectState = unknown> {
  connection?: Connection;
  sourceText: string;
  statement?: { text: string; from: number; to: number };
  variables?: Record<string, any>;
  editorView?: EditorView | null;
  dialectState?: TDialectState;
  context: RawQueryContext<TDialectState>;
}

export interface RawQueryContextMenuContext<TDialectState = unknown> {
  editorView: EditorView;
  statement: { text: string; from: number; to: number } | null;
  hasSelection: boolean;
  selectionText: string;
  dialectState?: TDialectState;
  context: RawQueryContext<TDialectState>;
}

export interface RawQueryDialectContextMenuConfig<TDialectState = unknown> {
  getItems?: (
    ctx: RawQueryContextMenuContext<TDialectState>
  ) => ContextMenuItem[];
  buildMenu?: (
    ctx: RawQueryContextMenuContext<TDialectState>
  ) => ContextMenuItem[];
}

/**
 * Unified Master Contract for Database Dialect Plugins
 * Consolidates layout configs (header, footer, result) with logic (execution, formatting, dialect state, and context menu).
 */
export interface RawQueryPlugin<TDialectState = any> {
  name: string;
  databaseType: DatabaseClientType;
  header?: RawQueryHeaderConfig;
  footer?: RawQueryFooterConfig;
  result?: RawQueryResultConfig;
  isFormatSupported?: boolean;
  isVariableSupported?: boolean;
  createDialectState?: () => TDialectState;
  dialectState?: TDialectState;
  onInit?: (context: RawQueryContext<TDialectState>) => void | Promise<void>;
  preloadSchema?: (context: RawQueryContext<TDialectState>) => Promise<void>;
  loadSchema?: (context: RawQueryContext<TDialectState>) => Promise<void>;
  resolveStatement?: (
    view: EditorView,
    context: RawQueryContext<TDialectState>
  ) => { text: string; from: number; to: number } | null;
  beforeExecute?: (
    ctx: RawQueryExecutionContext<TDialectState>
  ) => Promise<boolean> | boolean;
  execute: (
    ctx: RawQueryExecutionContext<TDialectState>
  ) => Promise<RawQueryExecutionResult>;
  afterExecute?: (
    result: RawQueryExecutionResult,
    ctx: RawQueryExecutionContext<TDialectState>
  ) => Promise<void> | void;
  formatCode?: (
    code: string,
    context: RawQueryContext<TDialectState>
  ) => Promise<string> | string;
  getEditorExtensions?: (
    context: RawQueryContext<TDialectState>
  ) => Extension[];
  contextMenu?: RawQueryDialectContextMenuConfig<TDialectState>;
  onDispose?: (context: RawQueryContext<TDialectState>) => void;
}

export type RawQueryDialectPlugin<TDialectState = any> =
  RawQueryPlugin<TDialectState>;

export type RawQueryProfile<TState = any> = RawQueryPlugin<TState>;

export function defineRawQueryPlugin<TDialectState = any>(
  plugin: RawQueryPlugin<TDialectState>
): RawQueryPlugin<TDialectState> {
  return plugin;
}

export const defineRawQueryProfile = defineRawQueryPlugin;
