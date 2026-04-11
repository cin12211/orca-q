import type { EnvironmentTag } from '../types/environmentTag.types';

export const environmentTagService = {
  getAll: (): Promise<EnvironmentTag[]> => window.environmentTagApi.getAll(),

  getOne: (id: string): Promise<EnvironmentTag | null> =>
    window.environmentTagApi.getOne(id),

  create: (tag: EnvironmentTag): Promise<EnvironmentTag> =>
    window.environmentTagApi.create(tag),

  update: (tag: EnvironmentTag): Promise<EnvironmentTag | null> =>
    window.environmentTagApi.update(tag),

  delete: (id: string): Promise<void> => window.environmentTagApi.delete(id),
};
