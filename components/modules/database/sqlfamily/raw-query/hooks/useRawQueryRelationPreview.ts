import { ref } from 'vue';
import { usePreviewRelations } from '~/core/composables/usePreviewRelations';
import type { MappedRawColumn } from '../interfaces';

/**
 * Wraps the generic preview-relation breadcrumb store with raw-query specific
 * concerns: tracking the *root* table for the current preview session and
 * dispatching the correct (forward vs. back) modal based on column metadata.
 */
export const useRawQueryRelationPreview = () => {
  const relationRoot = ref<{
    tableName: string;
    schemaName: string;
  } | null>(null);

  const {
    previewRelationBreadcrumbs,
    onOpenBackReferencedTableModal,
    onOpenForwardReferencedTableModal,
    onUpdateSelectedTabInBreadcrumb,
    onClearBreadcrumbs,
    onBackPreviousBreadcrumb,
    onBackPreviousBreadcrumbByIndex,
  } = usePreviewRelations();

  const openRelationPreview = (column: MappedRawColumn, value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return;
    }

    const { schemaName, tableName } = column;

    if (!schemaName || !tableName) {
      return;
    }

    relationRoot.value = { schemaName, tableName };

    const recordId = String(value);

    if (column.isForeignKey && column.foreignKey) {
      onOpenForwardReferencedTableModal({
        id: recordId,
        tableName: column.foreignKey.referenced_table,
        columnName: column.foreignKey.referenced_column,
        schemaName: column.foreignKey.referenced_table_schema,
      });
      return;
    }

    onOpenBackReferencedTableModal({
      id: recordId,
      tableName,
      schemaName,
      columnName: column.sourceColumnName || column.originalName,
    });
  };

  const clearRelationPreview = () => {
    onClearBreadcrumbs();
    relationRoot.value = null;
  };

  return {
    relationRoot,
    previewRelationBreadcrumbs,
    openRelationPreview,
    clearRelationPreview,
    onOpenBackReferencedTableModal,
    onOpenForwardReferencedTableModal,
    onUpdateSelectedTabInBreadcrumb,
    onBackPreviousBreadcrumb,
    onBackPreviousBreadcrumbByIndex,
  };
};
