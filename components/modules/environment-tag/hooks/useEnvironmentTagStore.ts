import { defineStore } from 'pinia';
import { ref } from 'vue';
import dayjs from 'dayjs';
import { uuidv4 } from '~/core/helpers';
import { DEFAULT_ENV_TAGS } from '../constants/DEFAULT_ENV_TAGS';
import { environmentTagService } from '../services/environmentTag.service';
import type { TagColor } from '../types/environmentTag.enums';
import type { EnvironmentTag } from '../types/environmentTag.types';

export const useEnvironmentTagStore = defineStore('environment-tag', () => {
  const tags = ref<EnvironmentTag[]>([]);
  const isLoading = ref(false);

  const loadTags = async () => {
    isLoading.value = true;
    try {
      const all = await environmentTagService.getAll();
      if (all.length === 0) {
        // Seed the 5 default tags on first launch
        for (const defaultTag of DEFAULT_ENV_TAGS) {
          await environmentTagService.create(defaultTag);
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
    const created = await environmentTagService.create(tag);
    tags.value = [...tags.value, created];
    return created;
  };

  const updateTag = async (tag: EnvironmentTag): Promise<EnvironmentTag> => {
    const result = await environmentTagService.update(tag);
    if (result) {
      const idx = tags.value.findIndex(t => t.id === tag.id);
      if (idx !== -1) tags.value.splice(idx, 1, result);
    }
    return result ?? tag;
  };

  /**
   * Delete a tag and cascade: remove its ID from all connections.
   * Cascade is handled in the store to avoid a direct service-layer dependency
   * between the environment-tag service and the connection service.
   */
  const deleteTag = async (id: string) => {
    await environmentTagService.delete(id);
    tags.value = tags.value.filter(t => t.id !== id);

    // Cascade: remove orphaned tagId from all connections
    const { useManagementConnectionStore } = await import(
      '~/core/stores/managementConnectionStore'
    );
    const connectionStore = useManagementConnectionStore();
    const affected = connectionStore.connections.filter(c =>
      c.tagIds?.includes(id)
    );
    for (const conn of affected) {
      const updated = {
        ...conn,
        tagIds: (conn.tagIds ?? []).filter(tid => tid !== id),
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
