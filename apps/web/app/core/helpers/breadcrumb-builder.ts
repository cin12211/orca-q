import { uuidv4 } from '~/core/helpers';

export type PreviewRelationBreadcrumbType =
  | 'backReferenced'
  | 'forwardReferenced';

export type PreviewRelationBreadcrumb = {
  id: string;
  type: PreviewRelationBreadcrumbType;
  schemaName: string;
  tableName: string;
  columnName: string;
  recordId: string;
  selectedTab?: string;
};

export type PreviewRelationPayload = {
  id: string;
  tableName: string;
  columnName: string;
  schemaName: string;
};

export const createPreviewRelationBreadcrumb = (
  payload: PreviewRelationPayload,
  type: PreviewRelationBreadcrumbType
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
