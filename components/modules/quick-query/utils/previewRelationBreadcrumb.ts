import { uuidv4 } from '~/core/helpers';
import type { PreviewRelationBreadcrumb } from '../previewRelationTable/PreviewRelationTable.vue';

export type PreviewRelationPayload = {
  id: string;
  tableName: string;
  columnName: string;
  schemaName: string;
};

export const createPreviewRelationBreadcrumb = (
  payload: PreviewRelationPayload,
  type: PreviewRelationBreadcrumb['type']
): PreviewRelationBreadcrumb => ({
  id: uuidv4(),
  type,
  schemaName: payload.schemaName,
  tableName: payload.tableName,
  columnName: payload.columnName,
  recordId: payload.id,
});

export const updatePreviewRelationBreadcrumbTab = (
  breadcrumb: PreviewRelationBreadcrumb,
  selectedTab: string,
  schemaName: string
): PreviewRelationBreadcrumb => ({
  ...breadcrumb,
  selectedTab,
  schemaName,
});

export const keepPreviewRelationBreadcrumbsUntil = (
  breadcrumbs: PreviewRelationBreadcrumb[],
  index: number
) => breadcrumbs.filter((_, i) => i <= index);
