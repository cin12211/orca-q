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
  const {
    getSchemaName,
    executeWithSafeMode,
    showSqlPreview,
    executeWithLoading,
  } = helpers;

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
      await executeWithLoading(
        async () => {
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
        },
        state.isFetching, // or safeModeLoading? safeMode already handles loading for the action it wraps usually, checking helpers.
        'Failed to delete function'
      );
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
      await executeWithLoading(
        async () => {
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
        },
        state.isFetching,
        'Failed to rename function'
      );
    });
  };

  const onGenFunctionCallSQL = async () => {
    if (!state.selectedItem.value) return;

    showSqlPreview('', 'CALL Statement');
    state.isFetching.value = true;

    await executeWithLoading(
      async () => {
        const signature = await $fetch<FunctionSignature | null>(
          '/api/get-function-signature',
          {
            method: 'POST',
            body: {
              dbConnectionString: options.currentConnectionString.value,
              functionId: state.selectedItem.value!.id,
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
      },
      state.isFetching,
      'Failed to get function signature'
    );
  };

  const onGenFunctionSelectSQL = async () => {
    if (!state.selectedItem.value) return;

    showSqlPreview('', 'SELECT Function');
    state.isFetching.value = true;

    await executeWithLoading(
      async () => {
        const signature = await $fetch<FunctionSignature | null>(
          '/api/get-function-signature',
          {
            method: 'POST',
            body: {
              dbConnectionString: options.currentConnectionString.value,
              functionId: state.selectedItem.value!.id,
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
      },
      state.isFetching,
      'Failed to get function signature'
    );
  };

  const onGenFunctionDDL = async () => {
    if (
      !state.selectedItem.value ||
      state.selectedItem.value.tabViewType !== TabViewType.FunctionsDetail
    )
      return;

    await executeWithLoading(
      async () => {
        showSqlPreview('', 'Function DDL');
        const def = await $fetch('/api/get-one-function', {
          method: 'POST',
          body: {
            dbConnectionString: options.currentConnectionString.value,
            functionId: state.selectedItem.value!.id,
          },
        });

        if (def) {
          showSqlPreview(def as string, 'Function DDL');
        } else {
          throw new Error('Could not retrieve function definition');
        }
      },
      state.isFetching,
      'Failed to get function DDL'
    );
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
