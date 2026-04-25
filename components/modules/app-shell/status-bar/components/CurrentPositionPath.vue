<script setup lang="ts">
import { storeToRefs } from 'pinia';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '#components';
import { getDatabaseSupportByType } from '~/components/modules/connection';
import {
  EnvTagColorDot,
  TAG_COLOR_MAP,
} from '~/components/modules/environment-tag';
import {
  useSchemaStore,
  useTabViewsStore,
  useWorkspacesStore,
  useEnvironmentTagStore,
} from '~/core/stores';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';

const workspaceStore = useWorkspacesStore();
const connectionStore = useManagementConnectionStore();
const tabViewStore = useTabViewsStore();
const schemaStore = useSchemaStore();
const tagStore = useEnvironmentTagStore();

const { selectedWorkspace } = storeToRefs(workspaceStore);
const { selectedConnection } = storeToRefs(connectionStore);
const { activeSchema } = storeToRefs(schemaStore);
const { activeTab } = storeToRefs(tabViewStore);

const isShowSchemaName = computed(
  () => !!activeSchema.value && !!selectedConnection.value
);
const isShowTabName = computed(
  () => !!activeSchema.value && !!selectedConnection.value && !!activeTab.value
);
const selectedConnectionTags = computed(() => {
  return selectedConnection.value
    ? tagStore.getTagsByIds(selectedConnection.value.tagIds ?? [])
    : [];
});
</script>

<template>
  <Breadcrumb>
    <BreadcrumbList class="gap-0.5! min-w-0 flex-nowrap">
      <BreadcrumbItem class="min-w-0 text-xs">
        <Icon
          v-if="selectedWorkspace?.icon"
          :name="selectedWorkspace.icon"
          class="size-3! flex-shrink-0"
        />
        <span class="truncate">{{ selectedWorkspace?.name }}</span>
      </BreadcrumbItem>

      <BreadcrumbSeparator v-if="selectedConnection?.id" />
      <BreadcrumbItem class="min-w-0 text-xs">
        <component
          v-if="selectedConnection?.id"
          :is="getDatabaseSupportByType(selectedConnection?.type)?.icon"
          class="size-3! flex-shrink-0"
        />

        <span class="min-w-0 truncate">{{ selectedConnection?.name }}</span>
        <div
          v-if="selectedConnectionTags.length"
          class="flex max-w-28 flex-shrink-0 items-center gap-0.5 overflow-hidden"
        >
          <span
            v-for="tag in selectedConnectionTags"
            :key="tag.id"
            :class="[
              'inline-flex h-3.5 max-w-14 flex-shrink-0 items-center gap-0.5 rounded-[3px] px-1 text-[9px] font-medium leading-none',
              TAG_COLOR_MAP[tag.color]?.badgeClass ??
                'bg-muted text-muted-foreground',
            ]"
          >
            <EnvTagColorDot :color="tag.color" size="sm" class="scale-75" />
            <span class="truncate">{{ tag.name }}</span>
          </span>
        </div>
      </BreadcrumbItem>

      <!-- <BreadcrumbSeparator v-if="isShowSchemaName" />
      <BreadcrumbItem class="text-xs" v-if="isShowSchemaName">
        {{ activeSchema?.name }}
      </BreadcrumbItem>

      <BreadcrumbSeparator v-if="isShowTabName" />
      <BreadcrumbItem class="text-xs" v-if="isShowTabName">
        {{ activeTab?.name }}
      </BreadcrumbItem> -->
    </BreadcrumbList>
  </Breadcrumb>
</template>
