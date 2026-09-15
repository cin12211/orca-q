import type { Component, ShallowRef } from 'vue';
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
import type { RawQueryDialectPlugin } from './rawQueryPlugin.types';

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

export interface RawQueryResultProfile {
  views: readonly RawQueryResultViewDefinition[];
  tabs?: readonly RawQueryResultTabDefinition[];
}

/**
 * Master Context for Raw Query
 * Shared universally across Header, Footer, Result, and Dialect extension components.
 * Supports generic TDialectState to ensure 100% type-safe access to dialect-specific state.
 */
export interface RawQueryContext<TDialectState = Record<string, any>> {
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

/**
 * Single unified context alias: RawQueryResultViewContext is RawQueryContext.
 */
export type RawQueryResultViewContext<TDialectState = Record<string, any>> =
  RawQueryContext<TDialectState>;

export interface RawQueryHeaderProfile {
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

export interface RawQueryFooterProfile {
  /**
   * Components rendered in the left cluster of the footer (e.g. CursorInfo, GuidePopover)
   */
  leftComponents: Component[];

  /**
   * Action components rendered in the right cluster of the footer (e.g. FormatAction, ExplainAction, ExecuteAction)
   */
  rightComponents: Component[];
}

/**
 * Master interface for Raw Query Database Profile
 */
export interface RawQueryProfile<TState = any> {
  databaseType: DatabaseClientType;
  header: RawQueryHeaderProfile;
  footer: RawQueryFooterProfile;
  result: RawQueryResultProfile;
  /**
   * Optional dialect plugin handling lifecycle hooks, statement resolution, execution and formatting
   */
  plugin?: RawQueryDialectPlugin<TState>;
  /**
   * Whether statement/code formatting is supported for this database client
   */
  isFormatSupported?: boolean;
  /**
   * Whether query variables are supported for this database client
   */
  isVariableSupported?: boolean;
}

export function defineRawQueryProfile<TState = any>(
  profile: RawQueryProfile<TState>
): RawQueryProfile<TState> {
  return profile;
}
