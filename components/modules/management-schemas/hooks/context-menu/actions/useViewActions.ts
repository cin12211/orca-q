import { toast } from 'vue-sonner';
import {
  generateDropViewSQL,
  generateRenameViewSQL,
  generateRefreshMaterializedViewSQL,
  generateViewSelectSQL,
} from '~/components/modules/management-schemas/utils/generateViewSQL';
import { TabViewType } from '~/core/stores/useTabViewsStore';
import { ViewSchemaEnum } from '~/core/types';
import type { ViewDefinitionResponse } from '~/server/api/get-view-definition';
import type { ContextMenuState, SchemaContextMenuOptions } from '../types';
import type { useContextMenuHelpers } from '../useContextMenuHelpers';

export function useViewActions(
  options: SchemaContextMenuOptions,
  state: ContextMenuState,
  helpers: ReturnType<typeof useContextMenuHelpers>
) {
  const {
    getSchemaName,
    executeWithSafeMode,
    showSqlPreview,
    executeWithLoading,
  } = helpers;

  /**
   * Get view info from schema
   */
  const getViewInfo = (viewId: string) => {
    const views = options.activeSchema.value?.views || [];
    return views.find(v => v.oid === viewId);
  };

  /**
   * Get view columns from viewDetails
   */
  const getViewColumns = (viewName: string): string[] => {
    const viewDetails = options.activeSchema.value?.viewDetails;
    if (!viewDetails?.[viewName]?.columns) return [];
    return viewDetails[viewName].columns.map(col => col.name);
  };

  const onGenViewSelectSQL = () => {
    if (!state.selectedItem.value) return;
    const viewInfo = getViewInfo(state.selectedItem.value.id);
    const viewName = viewInfo?.name || state.selectedItem.value.title;
    const columns = getViewColumns(viewName);
    const schemaName = getSchemaName();

    const sql = generateViewSelectSQL(schemaName, viewName, columns);
    showSqlPreview(sql, 'SELECT Statement');
  };

  const onGenViewDDL = async () => {
    if (!state.selectedItem.value) return;

    const viewInfo = getViewInfo(state.selectedItem.value.id);
    const viewName = viewInfo?.name || state.selectedItem.value.title;
    const viewType =
      viewInfo?.type === ViewSchemaEnum.MaterializedView
        ? 'MATERIALIZED VIEW'
        : 'VIEW';

    showSqlPreview('', `${viewType} DDL`);
    await executeWithLoading(
      async () => {
        const response = await $fetch<ViewDefinitionResponse>(
          '/api/get-view-definition',
          {
            method: 'POST',
            body: {
              dbConnectionString: options.currentConnectionString.value,
              viewId: state.selectedItem.value!.id,
              schemaName: getSchemaName(),
              viewName,
            },
          }
        );

        if (response && response.definition) {
          showSqlPreview(response.definition, `${viewType} DDL`);
        } else {
          throw new Error('Could not retrieve view definition');
        }
      },
      state.isFetching,
      'Failed to get view DDL'
    );
  };

  const onRenameView = () => {
    if (
      !state.selectedItem.value ||
      state.selectedItem.value.tabViewType !== TabViewType.ViewDetail
    ) {
      return;
    }

    const viewInfo = getViewInfo(state.selectedItem.value.id);
    const viewName = viewInfo?.name || state.selectedItem.value.title;

    state.renameDialogType.value = TabViewType.ViewDetail;
    state.renameDialogValue.value = viewName;
    state.renameDialogOpen.value = true;
    state.renameDialogParameters.value = '';
  };

  const performRenameView = async (newName: string) => {
    // Find view info to determine if it's materialized
    const views = options.activeSchema.value?.views || [];
    const viewInfo = views.find(v => v.name === state.renameDialogValue.value);
    const isMaterialized = viewInfo?.type === ViewSchemaEnum.MaterializedView;

    const sql = generateRenameViewSQL(
      getSchemaName(),
      state.renameDialogValue.value,
      newName,
      isMaterialized
    );

    await executeWithSafeMode(sql, 'save', async () => {
      await executeWithLoading(
        async () => {
          await $fetch('/api/execute', {
            method: 'POST',
            body: {
              dbConnectionString: options.currentConnectionString.value,
              query: sql,
            },
          });

          toast.success('View renamed successfully');
          await options.onRefreshSchema();
        },
        state.isFetching,
        'Failed to rename view'
      );
    });
  };

  const onDeleteView = async () => {
    if (
      !state.selectedItem.value ||
      state.selectedItem.value.tabViewType !== TabViewType.ViewDetail
    ) {
      return;
    }

    const viewInfo = getViewInfo(state.selectedItem.value.id);
    const viewName = viewInfo?.name || state.selectedItem.value.title;
    const isMaterialized = viewInfo?.type === ViewSchemaEnum.MaterializedView;

    const sql = generateDropViewSQL(
      getSchemaName(),
      viewName,
      isMaterialized,
      false
    );

    await executeWithSafeMode(sql, 'delete', async () => {
      await executeWithLoading(
        async () => {
          await $fetch('/api/execute', {
            method: 'POST',
            body: {
              dbConnectionString: options.currentConnectionString.value,
              query: sql,
            },
          });

          toast.success('View deleted successfully');
          await options.onRefreshSchema();
        },
        state.isFetching,
        'Failed to delete view'
      );
    });
  };

  const onRefreshMaterializedView = async () => {
    if (
      !state.selectedItem.value ||
      state.selectedItem.value.tabViewType !== TabViewType.ViewDetail
    ) {
      return;
    }

    const viewInfo = getViewInfo(state.selectedItem.value.id);
    if (viewInfo?.type !== ViewSchemaEnum.MaterializedView) {
      toast.error('Only materialized views can be refreshed');
      return;
    }

    const viewName = viewInfo?.name || state.selectedItem.value.title;
    const sql = generateRefreshMaterializedViewSQL(
      getSchemaName(),
      viewName,
      false
    );

    await executeWithSafeMode(sql, 'save', async () => {
      await executeWithLoading(
        async () => {
          await $fetch('/api/execute', {
            method: 'POST',
            body: {
              dbConnectionString: options.currentConnectionString.value,
              query: sql,
            },
          });

          toast.success('Materialized view refreshed successfully');
        },
        state.isFetching,
        'Failed to refresh materialized view'
      );
    });
  };

  return {
    getViewInfo,
    getViewColumns,
    onGenViewSelectSQL,
    onGenViewDDL,
    onRenameView,
    performRenameView,
    onDeleteView,
    onRefreshMaterializedView,
  };
}
