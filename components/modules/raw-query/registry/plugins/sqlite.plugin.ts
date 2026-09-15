import { defineAsyncComponent } from 'vue';
import type { EditorView } from '@codemirror/view';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  defineRawQueryPlugin,
  type RawQueryExecutionContext,
} from '../rawQueryPlugin.types';
import {
  createStandardSqlResultProfile,
  getStandardSqlContextMenuItems,
  sqlStatementResolver,
} from './sql.plugin';

const lazyCursorInfo = defineAsyncComponent(
  () => import('../../components/common/RawQueryCursorInfo.vue')
);
const lazySqlFormatAction = defineAsyncComponent(
  () => import('../../components/common/RawQuerySqlFormatAction.vue')
);
const lazyExecuteAction = defineAsyncComponent(
  () => import('../../components/common/RawQueryExecuteAction.vue')
);

export const sqlitePlugin = defineRawQueryPlugin({
  name: 'sqlite-plugin',
  databaseType: DatabaseClientType.SQLITE3,
  isFormatSupported: true,
  isVariableSupported: false,
  header: {},
  footer: {
    leftComponents: [lazyCursorInfo],
    rightComponents: [lazySqlFormatAction, lazyExecuteAction],
  },
  result: createStandardSqlResultProfile(),
  resolveStatement: (view: EditorView) => sqlStatementResolver(view),
  execute: async (ctx: RawQueryExecutionContext) => {
    await ctx.context.onExecuteCurrent?.();
    return { success: true };
  },
  contextMenu: {
    getItems: getStandardSqlContextMenuItems,
  },
});

export const sqliteRawQueryProfile = sqlitePlugin;
