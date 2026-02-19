import type { Ref } from 'vue';
import type { FlattenedTreeFileSystemItem } from '~/components/base/Tree';
import type { Schema } from '~/core/stores/useSchemaStore';
import type { TabViewType } from '~/core/stores/useTabViewsStore';

export interface SchemaContextMenuOptions {
  schemaName: Ref<string>;
  activeSchema: Ref<Schema | undefined>;
  onRefreshSchema: () => Promise<void>;
  currentConnectionString: Ref<string | undefined>;
}

export interface ContextMenuState {
  selectedItem: Ref<FlattenedTreeFileSystemItem['value'] | null>;

  // Safe Mode Dialog
  safeModeDialogOpen: Ref<boolean>;
  safeModeDialogSQL: Ref<string>;
  safeModeDialogType: Ref<'save' | 'delete'>;
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

export type SafeModeDialogType = 'save' | 'delete';

export enum ExportDataFormatType {
  CSV = 'csv',
  JSON = 'json',
  SQL = 'sql',
}
