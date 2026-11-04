import { defineStore } from 'pinia';
import { ref } from 'vue';
import dayjs from 'dayjs';
import { DEFAULT_ENV_TAGS } from '~/components/modules/environment-tag/constants/DEFAULT_ENV_TAGS';
import type { TagColor } from '~/components/modules/environment-tag/types/environmentTag.enums';
import type { EnvironmentTag } from '~/components/modules/environment-tag/types/environmentTag.types';
import { uuidv4 } from '~/core/helpers';
import { createStorageApis } from '~/core/storage';
import { useManagementConnectionStore } from './managementConnectionStore';

type ConnectionTaggable = {
  id: string;
  tagIds?: string[];
};

export const useEnvironmentTagStore = defineStore('environment-tag', () => {
  const storageApis = createStorageApis();
  const connectionStore = useManagementConnectionStore();

  const tags = ref<EnvironmentTag[]>([]);
  const isLoading = ref(false);

  const loadTags = async () => {
    isLoading.value = true;
    try {
      const all = await storageApis.environmentTagStorage.getAll();
      if (all.length === 0) {
        // Seed the 5 default tags on first launch.
        for (const defaultTag of DEFAULT_ENV_TAGS) {
          await storageApis.environmentTagStorage.create(defaultTag);
        }
        tags.value = [...DEFAULT_ENV_TAGS];
      } else {
        tags.value = all;
      }
    } finally {
      isLoading.value = false;
    }
  };

  const createTag = async (payload: {
    name: string;
    color: TagColor;
    strictMode: boolean;
  }): Promise<EnvironmentTag> => {
    const tag: EnvironmentTag = {
      id: uuidv4(),
      name: payload.name,
      color: payload.color,
      strictMode: payload.strictMode,
      createdAt: dayjs().toISOString(),
    };
    const created = await storageApis.environmentTagStorage.create(tag);
    tags.value = [...tags.value, created];
    return created;
  };

  const updateTag = async (tag: EnvironmentTag): Promise<EnvironmentTag> => {
    const result = await storageApis.environmentTagStorage.update(tag);
    if (result) {
      const idx = tags.value.findIndex(t => t.id === tag.id);
      if (idx !== -1) {
        tags.value.splice(idx, 1, result);
      }
    }
    return result ?? tag;
  };

  const deleteTag = async (id: string) => {
    await storageApis.environmentTagStorage.delete(id);
    tags.value = tags.value.filter(t => t.id !== id);

    const affected = connectionStore.connections.filter(
      (c: ConnectionTaggable) => c.tagIds?.includes(id)
    );
    for (const conn of affected) {
      const updated = {
        ...conn,
        tagIds: (conn.tagIds ?? []).filter((tid: string) => tid !== id),
      };
      await connectionStore.updateConnection(updated);
    }
  };

  const getTagById = (id: string): EnvironmentTag | undefined => {
    return tags.value.find(t => t.id === id);
  };

  const getTagsByIds = (ids: string[]): EnvironmentTag[] => {
    return ids.flatMap(id => {
      const tag = getTagById(id);
      return tag ? [tag] : [];
    });
  };

  return {
    tags,
    isLoading,
    loadTags,
    createTag,
    updateTag,
    deleteTag,
    getTagById,
    getTagsByIds,
  };
});
