import { computed, ref, type Ref } from 'vue';
import { toast } from 'vue-sonner';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import type { MappedRawColumn } from '../interfaces';
import {
  buildRawQueryDeletes,
  buildRawQueryUpdates,
  type RawQueryDeleteGroup,
  type RawQueryEditedCell,
  type RawQueryUpdateGroup,
} from '../utils/buildRawQueryUpdates';

export type RawQueryMutationAction = 'update' | 'delete';

interface UseRawQueryMutationOptions {
  connection: Ref<Connection | undefined>;
  columns: Ref<MappedRawColumn[]>;
  rows: Ref<Record<string, unknown>[]>;
  editedCells: Ref<RawQueryEditedCell[]>;
  selectedRows: Ref<Record<string, unknown>[]>;
  /** Called after a successful save so the result can clear its dirty state. */
  onSaved: () => void;
  /** Called after a successful delete so the parent can refresh. */
  onDeleted: () => void;
}

/**
 * Orchestrates the raw-query update flow:
 *
 *   editedCells ──► buildRawQueryUpdates ──► preview SQL
 *                                              │
 *                                  user clicks Confirm
 *                                              │
 *                                              ▼
 *                       Promise.all of POST /api/tables/bulk-update per table
 *
 * Updates are never executed without an explicit user confirm step.
 */
export const useRawQueryMutation = ({
  connection,
  columns,
  rows,
  editedCells,
  selectedRows,
  onSaved,
  onDeleted,
}: UseRawQueryMutationOptions) => {
  const isPreviewOpen = ref(false);
  const isMutating = ref(false);
  const pendingAction = ref<RawQueryMutationAction>('update');

  const previewResult = computed(() =>
    buildRawQueryUpdates({
      editedCells: editedCells.value,
      columns: columns.value,
      rows: rows.value,
      dbType: connection.value?.type as DatabaseClientType | undefined,
    })
  );

  const previewGroups = computed<RawQueryUpdateGroup[]>(
    () => previewResult.value.groups
  );

  const previewSql = computed(() =>
    previewGroups.value.flatMap(group => group.sqlStatements).join('\n')
  );

  const hasNoPkWarning = computed(() =>
    previewGroups.value.some(group => group.hasNoPkWarning)
  );

  const totalUpdateCount = computed(() =>
    previewGroups.value.reduce((acc, group) => acc + group.updates.length, 0)
  );

  const requestSave = () => {
    if (!editedCells.value.length) {
      toast.info('No changes to save.');
      return;
    }

    if (!previewGroups.value.length) {
      toast.warning(
        'No safely updatable rows detected. Edits target columns that lack primary keys in the result.'
      );
      return;
    }

    pendingAction.value = 'update';
    isPreviewOpen.value = true;
  };

  // ------------------------------------------------------------------ delete
  const deleteResult = computed(() =>
    buildRawQueryDeletes({
      selectedRows: selectedRows.value,
      columns: columns.value,
      dbType: connection.value?.type as DatabaseClientType | undefined,
    })
  );

  const deleteGroups = computed<RawQueryDeleteGroup[]>(
    () => deleteResult.value.groups
  );

  const deleteHasNoPkWarning = computed(() =>
    deleteGroups.value.some(g => g.hasNoPkWarning)
  );

  const totalDeleteCount = computed(() =>
    deleteGroups.value.reduce((acc, g) => acc + g.pKeyValues.length, 0)
  );

  const requestDelete = () => {
    if (!selectedRows.value.length) {
      toast.info('No rows selected for deletion.');
      return;
    }

    if (!deleteGroups.value.length) {
      toast.warning(
        'Selected rows cannot be safely deleted — columns lack primary-key metadata.'
      );
      return;
    }

    pendingAction.value = 'delete';
    isPreviewOpen.value = true;
  };

  const cancelPreview = () => {
    isPreviewOpen.value = false;
  };

  const confirmAndExecute = async () => {
    if (!connection.value) {
      toast.error('No active connection.');
      return;
    }

    isMutating.value = true;
    const connParams = getConnectionParams(connection.value);

    try {
      if (pendingAction.value === 'update') {
        const requests = previewGroups.value.map(group =>
          $fetch<{ queryTime: number }>('/api/tables/bulk-update', {
            method: 'POST',
            body: {
              tableName: group.tableName,
              schemaName: group.schemaName,
              pKeys: group.pKeys,
              updates: group.updates,
              ...connParams,
            },
          })
        );
        await Promise.all(requests);
        toast.success(
          `Saved ${totalUpdateCount.value} row${totalUpdateCount.value === 1 ? '' : 's'} successfully.`
        );
        isPreviewOpen.value = false;
        onSaved();
      } else {
        const requests = deleteGroups.value.map(group =>
          $fetch<{ queryTime: number }>('/api/tables/bulk-delete', {
            method: 'POST',
            body: {
              tableName: group.tableName,
              schemaName: group.schemaName,
              pKeys: group.pKeys,
              pKeyValues: group.pKeyValues,
              ...connParams,
            },
          })
        );
        await Promise.all(requests);
        toast.success(
          `Deleted ${totalDeleteCount.value} row${totalDeleteCount.value === 1 ? '' : 's'} successfully.`
        );
        isPreviewOpen.value = false;
        onDeleted();
      }
    } catch (error) {
      const message =
        (error as { data?: { message?: string }; message?: string })?.data
          ?.message ||
        (error as { message?: string })?.message ||
        'Unknown error while executing.';
      console.error('Raw query mutation failed:', error);
      toast.error(message);
    } finally {
      isMutating.value = false;
    }
  };

  return {
    isPreviewOpen,
    isMutating,
    pendingAction,
    // update
    previewGroups,
    previewSql,
    hasNoPkWarning,
    totalUpdateCount,
    skippedEdits: computed(() => previewResult.value.skipped),
    requestSave,
    // delete
    deleteGroups,
    deleteHasNoPkWarning,
    totalDeleteCount,
    requestDelete,
    // shared
    cancelPreview,
    confirmAndExecute,
  };
};
