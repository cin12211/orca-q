import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { ContextMenuItem } from '~/components/base/context-menu/menuContext.type';
import type { Connection } from '~/core/stores';
import type { RawQueryContext } from './rawQueryProfile.types';

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
  ) =>
    | (ContextMenuItem & { section?: RawQueryContextMenuSection })[]
    | ContextMenuItem[];
  buildMenu?: (
    ctx: RawQueryContextMenuContext<TDialectState>
  ) => ContextMenuItem[];
}

export interface RawQueryDialectPlugin<TDialectState = unknown> {
  name: string;
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

export function defineRawQueryPlugin<TDialectState = unknown>(
  plugin: RawQueryDialectPlugin<TDialectState>
): RawQueryDialectPlugin<TDialectState> {
  return plugin;
}
