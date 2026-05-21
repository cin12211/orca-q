import {
  createPreviewRelationBreadcrumb,
  keepPreviewRelationBreadcrumbsUntil,
  updatePreviewRelationBreadcrumbTab,
  type PreviewRelationBreadcrumb,
  type PreviewRelationPayload,
} from '~/core/helpers/breadcrumb-builder';

export const useQuickQueryPreviewRelations = () => {
  const previewRelationBreadcrumbs = ref<PreviewRelationBreadcrumb[]>([]);

  const onOpenBackReferencedTableModal = (payload: PreviewRelationPayload) => {
    previewRelationBreadcrumbs.value.push(
      createPreviewRelationBreadcrumb(payload, 'backReferenced')
    );
  };

  const onOpenForwardReferencedTableModal = (
    payload: PreviewRelationPayload
  ) => {
    previewRelationBreadcrumbs.value.push(
      createPreviewRelationBreadcrumb(payload, 'forwardReferenced')
    );
  };

  const onUpdateSelectedTabInBreadcrumb = (
    index: number,
    selectedTab: string,
    schemaName: string
  ) => {
    const breadcrumb = previewRelationBreadcrumbs.value[index];

    if (!breadcrumb) {
      return;
    }

    previewRelationBreadcrumbs.value[index] =
      updatePreviewRelationBreadcrumbTab(breadcrumb, selectedTab, schemaName);
  };

  const onClearBreadcrumbs = () => {
    previewRelationBreadcrumbs.value = [];
  };

  const onBackPreviousBreadcrumb = () => {
    previewRelationBreadcrumbs.value.pop();
  };

  const onBackPreviousBreadcrumbByIndex = (index: number) => {
    previewRelationBreadcrumbs.value = keepPreviewRelationBreadcrumbsUntil(
      previewRelationBreadcrumbs.value,
      index
    );
  };

  return {
    previewRelationBreadcrumbs,
    onOpenBackReferencedTableModal,
    onOpenForwardReferencedTableModal,
    onUpdateSelectedTabInBreadcrumb,
    onClearBreadcrumbs,
    onBackPreviousBreadcrumb,
    onBackPreviousBreadcrumbByIndex,
  };
};
