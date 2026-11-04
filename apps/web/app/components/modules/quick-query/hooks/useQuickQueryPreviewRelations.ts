import { usePreviewRelations } from '~/core/composables/usePreviewRelations';

export type {
  PreviewRelationBreadcrumb,
  PreviewRelationPayload,
} from '~/core/helpers/breadcrumb-builder';

export const useQuickQueryPreviewRelations = usePreviewRelations;
