import type {
  SchemaDiffRequest,
  SchemaDiffResponse,
} from '../types/schema-diff.types';

export const schemaDiffService = {
  diff: (body: SchemaDiffRequest): Promise<SchemaDiffResponse> =>
    $fetch<SchemaDiffResponse>('/api/schema-diff', { method: 'POST', body }),
};
