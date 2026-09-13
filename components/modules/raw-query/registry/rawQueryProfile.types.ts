import type { Component } from 'vue';
import type { DatabaseClientType } from '~/core/constants/database-client-type';
import type { Connection, RowQueryFile } from '~/core/stores';
import type { RedisDatabaseOption } from '~/core/types/redis-workspace.types';
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

/**
 * Context passed to raw query result renderers and views
 */
export interface RawQueryResultViewContext {
  activeTab: ExecutedResultItem;
  databaseType: DatabaseClientType;
  activeTabColumns: MappedRawColumn[];
  formattedData: Record<string, unknown>[];
  executeLoading: boolean;
  isStreaming: boolean;
  changeView(view: ViewMode): void;
}

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
  when?: (context: RawQueryResultViewContext) => RawQueryResultViewAvailability;
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
 * Context passed to all header registered components (badges, status indicators, custom selectors)
 */
export interface RawQueryHeaderContext {
  workspaceId: string;
  selectedConnectionId: string;
  connection?: Connection;
  connections: Connection[];
  disableConnectionSwitch: boolean;
  databaseType?: DatabaseClientType;
  currentFileInfo?: RowQueryFile;
  fileVariables: string;
  codeEditorLayout: RawQueryEditorLayout;
  redisDatabases?: RedisDatabaseOption[];
  redisDatabaseIndex?: number;
  rawQueryEditor?: RawQueryEditor;
  editor?: RawQueryEditor;
  onUpdateConnectionId?: (connectionId: string) => void;
  onUpdateRedisDatabaseIndex?: (databaseIndex: number) => void;
  onUpdateFileVariables?: (variables: string) => Promise<void> | void;
}

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

/**
 * Context passed to all footer components
 */
export interface RawQueryFooterContext {
  cursorInfo: EditorCursor;
  executeLoading: boolean;
  isStreaming: boolean;
  isRawViewMode?: boolean;
  explainAnalyzeOptionItems?: ExplainAnalyzeOptionItem[];
  serializeMode?: ExplainAnalyzeSerializeMode;
  databaseType?: DatabaseClientType;
  rawQueryEditor?: RawQueryEditor;
  editor?: RawQueryEditor;
  onFormatCurrentStatement?: () => void;
  onFormatAll?: () => void;
  onExplainAnalyzeCurrent?: () => void;
  toggleExplainOption?: (value: ExplainAnalyzeToggleOptionKey) => void;
  updateSerializeMode?: (value: ExplainAnalyzeSerializeMode) => void;
  onExecuteCurrent?: () => void;
  updateRawViewMode?: (value: boolean) => void;
  onCancelQuery?: () => void;
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
export interface RawQueryProfile {
  databaseType: DatabaseClientType;
  header: RawQueryHeaderProfile;
  footer: RawQueryFooterProfile;
  result: RawQueryResultProfile;
  /**
   * Whether statement/code formatting is supported for this database client
   */
  isFormatSupported?: boolean;
  /**
   * Whether query variables are supported for this database client
   */
  isVariableSupported?: boolean;
}

export function defineRawQueryProfile(
  profile: RawQueryProfile
): RawQueryProfile {
  return profile;
}
