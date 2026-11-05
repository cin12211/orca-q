import { usePreviewRelations } from '~/core/composables/usePreviewRelations';

export type {
  PreviewRelationBreadcrumb,
  PreviewRelationPayload,
} from '#shared/helpers/breadcrumb-builder';

export const useQuickQueryPreviewRelations = usePreviewRelations;
