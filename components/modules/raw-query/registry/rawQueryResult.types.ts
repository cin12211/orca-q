import type { Component } from 'vue';
import type { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  ExecutedResultItem,
  MappedRawColumn,
  ViewMode,
} from '../interfaces';

export interface RawQueryResultViewContext {
  activeTab: ExecutedResultItem;
  databaseType: DatabaseClientType;
  activeTabColumns: MappedRawColumn[];
  formattedData: Record<string, unknown>[];
  executeLoading: boolean;
  isStreaming: boolean;
  changeView(view: ViewMode): void;
}

export type RawQueryResultExecutionPolicy =
  | 'always'
  | 'success-only'
  | 'error-only';

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
