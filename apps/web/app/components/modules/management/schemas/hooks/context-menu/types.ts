import type { Ref } from 'vue';
import { QuickQueryMutationAction } from '~/components/modules/quick-query/constants';
import type { Connection } from '~/core/stores';
import type { Schema } from '~/core/stores/useSchemaStore';
import type { TabViewType } from '~/core/stores/useTabViewsStore';

export interface SchemaContextMenuItemValue {
  id: string;
  title: string;
  isFolder: boolean;
  icon: string;
  iconClass?: string;
  path?: string;
  name?: string;
  parameters?: string;
  tabViewType?: TabViewType;
}

export interface SchemaContextMenuSelection {
  value: SchemaContextMenuItemValue;
}

export interface SchemaContextMenuOptions {
  schemaName: Ref<string>;
  activeSchema: Ref<Schema | undefined>;
  onRefreshSchema: () => Promise<void>;
  connection: Ref<Connection | undefined>;
}

export interface ContextMenuState {
  selectedItem: Ref<SchemaContextMenuItemValue | null>;

  // Safe Mode Dialog
  safeModeDialogOpen: Ref<boolean>;
  safeModeDialogSQL: Ref<string>;
  safeModeDialogType: Ref<QuickQueryMutationAction>;
  pendingAction: Ref<(() => Promise<void>) | null>;

  // Rename Dialog
  renameDialogType: Ref<TabViewType | null>;
  renameDialogOpen: Ref<boolean>;
  renameDialogValue: Ref<string>;
  renameDialogParameters: Ref<string>;

  // SQL Preview Dialog
  sqlPreviewDialogOpen: Ref<boolean>;
  sqlPreviewDialogSQL: Ref<string>;
  sqlPreviewDialogTitle: Ref<string>;

  // Loading State
  isFetching: Ref<boolean>;
}

export type SafeModeDialogType = QuickQueryMutationAction;

export enum ExportDataFormatType {
  CSV = 'csv',
  JSON = 'json',
  SQL = 'sql',
}
