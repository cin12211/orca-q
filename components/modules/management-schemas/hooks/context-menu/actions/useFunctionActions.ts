import { toast } from 'vue-sonner';
import {
  generateFunctionCallSQL,
  generateFunctionSelectSQL,
  generateDropFunctionSQL,
  generateRenameFunctionSQL,
} from '~/components/modules/management-schemas/utils/generateFunctionSQL';
import { TabViewType } from '~/core/stores/useTabViewsStore';
import type { FunctionSignature } from '~/server/api/get-function-signature';
import type { ContextMenuState, SchemaContextMenuOptions } from '../types';
import type { useContextMenuHelpers } from '../useContextMenuHelpers';

export function useFunctionActions(
  options: SchemaContextMenuOptions,
  state: ContextMenuState,
  helpers: ReturnType<typeof useContextMenuHelpers>
) {
  const { getSchemaName, executeWithSafeMode, showSqlPreview } = helpers;

  const onDeleteFunction = async () => {
    if (
      !state.selectedItem.value ||
      state.selectedItem.value.tabViewType !== TabViewType.FunctionsDetail ||
      !state.selectedItem.value.name
    ) {
      return;
    }

    const sql = generateDropFunctionSQL(
      getSchemaName(),
      state.selectedItem.value.name,
      false,
      state.selectedItem.value.parameters
    );

    const functionName = state.selectedItem.value!.name;

    await executeWithSafeMode(sql, 'delete', async () => {
      try {
        await $fetch('/api/delete-function', {
          method: 'POST',
          body: {
            dbConnectionString: options.currentConnectionString.value,
            schemaName: getSchemaName(),
            functionName,
          },
        });

        toast.success('Function deleted successfully');
        await options.onRefreshSchema();
      } catch (e: unknown) {
        const error = e as { message?: string };
        toast.error(error.message || 'Failed to delete function');
      }
    });
  };

  const onRenameFunction = () => {
    if (
      !state.selectedItem.value ||
      state.selectedItem.value.tabViewType !== TabViewType.FunctionsDetail ||
      !state.selectedItem.value.name
    ) {
      return;
    }
    state.renameDialogType.value = TabViewType.FunctionsDetail;
    state.renameDialogValue.value = state.selectedItem.value.name;
    state.renameDialogOpen.value = true;
    state.renameDialogParameters.value =
      state.selectedItem.value.parameters || '';
  };

  const performRenameFunction = async (newName: string) => {
    const sql = generateRenameFunctionSQL(
      getSchemaName(),
      state.renameDialogValue.value,
      newName,
      state.renameDialogParameters.value
    );

    await executeWithSafeMode(sql, 'save', async () => {
      try {
        await $fetch('/api/rename-function', {
          method: 'POST',
          body: {
            dbConnectionString: options.currentConnectionString.value,
            schemaName: getSchemaName(),
            oldName: state.renameDialogValue.value,
            newName,
          },
        });

        toast.success('Function renamed successfully');
        await options.onRefreshSchema();
      } catch (e: unknown) {
        const error = e as { message?: string };
        toast.error(error.message || 'Failed to rename function');
      }
    });
  };

  const onGenFunctionCallSQL = async () => {
    if (!state.selectedItem.value) return;

    showSqlPreview('', 'CALL Statement');
    state.isFetching.value = true;

    try {
      const signature = await $fetch<FunctionSignature | null>(
        '/api/get-function-signature',
        {
          method: 'POST',
          body: {
            dbConnectionString: options.currentConnectionString.value,
            functionId: state.selectedItem.value.id,
          },
        }
      );

      const schemaName = getSchemaName();
      const functionName = signature?.name || '';

      let sql: string;
      if (signature?.parameters && signature.parameters.length > 0) {
        // Filter only IN and INOUT parameters
        const inputParams = signature.parameters.filter(
          p => p.mode === 'IN' || p.mode === 'INOUT' || p.mode === 'VARIADIC'
        );

        if (inputParams.length > 0) {
          const paramComment = inputParams
            .map(p => `${p.name}::${p.type}`)
            .join(', ');
          const paramArgs = inputParams.map(p => `:${p.name}`).join(', ');
          sql = `-- ${paramComment}\nCALL "${schemaName}"."${functionName}"(${paramArgs});`;
        } else {
          sql = `CALL "${schemaName}"."${functionName}"();`;
        }
      } else {
        sql = generateFunctionCallSQL(schemaName, functionName);
      }

      state.sqlPreviewDialogSQL.value = sql;
    } catch (e: unknown) {
      const error = e as { message?: string };
      toast.error(error.message || 'Failed to get function signature');
      state.sqlPreviewDialogOpen.value = false;
    } finally {
      state.isFetching.value = false;
    }
  };

  const onGenFunctionSelectSQL = async () => {
    if (!state.selectedItem.value) return;

    showSqlPreview('', 'SELECT Function');
    state.isFetching.value = true;

    try {
      const signature = await $fetch<FunctionSignature | null>(
        '/api/get-function-signature',
        {
          method: 'POST',
          body: {
            dbConnectionString: options.currentConnectionString.value,
            functionId: state.selectedItem.value.id,
          },
        }
      );

      const schemaName = getSchemaName();
      const functionName = signature?.name || '';

      let sql: string;
      if (signature?.parameters && signature.parameters.length > 0) {
        // Filter only IN and INOUT parameters
        const inputParams = signature.parameters.filter(
          p => p.mode === 'IN' || p.mode === 'INOUT' || p.mode === 'VARIADIC'
        );

        if (inputParams.length > 0) {
          const paramComment = inputParams
            .map(p => `${p.name}::${p.type}`)
            .join(', ');
          const paramArgs = inputParams.map(p => `:${p.name}`).join(', ');
          sql = `-- ${paramComment}\nSELECT * FROM "${schemaName}"."${functionName}"(${paramArgs});`;
        } else {
          sql = `SELECT * FROM "${schemaName}"."${functionName}"();`;
        }
      } else {
        sql = generateFunctionSelectSQL(schemaName, functionName);
      }

      state.sqlPreviewDialogSQL.value = sql;
    } catch (e: unknown) {
      console.log(e);
      const error = e as { message?: string };
      toast.error(error.message || 'Failed to get function signature');
      state.sqlPreviewDialogOpen.value = false;
    } finally {
      state.isFetching.value = false;
    }
  };

  const onGenFunctionDDL = async () => {
    if (
      !state.selectedItem.value ||
      state.selectedItem.value.tabViewType !== TabViewType.FunctionsDetail
    )
      return;

    try {
      state.isFetching.value = true;
      showSqlPreview('', 'Function DDL');
      const def = await $fetch('/api/get-one-function', {
        method: 'POST',
        body: {
          dbConnectionString: options.currentConnectionString.value,
          functionId: state.selectedItem.value.id,
        },
      });

      if (def) {
        showSqlPreview(def, 'Function DDL');
      } else {
        toast.error('Could not retrieve function definition');
      }
    } catch (e: unknown) {
      const error = e as { message?: string };
      toast.error(error.message || 'Failed to get function DDL');
    } finally {
      state.isFetching.value = false;
    }
  };

  return {
    onDeleteFunction,
    onRenameFunction,
    performRenameFunction,
    onGenFunctionCallSQL,
    onGenFunctionSelectSQL,
    onGenFunctionDDL,
  };
}
