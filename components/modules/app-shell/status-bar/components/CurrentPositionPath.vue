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
  useSchemaStore,
  useTabViewsStore,
  useWorkspacesStore,
} from '~/core/stores';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';

const workspaceStore = useWorkspacesStore();
const connectionStore = useManagementConnectionStore();
const tabViewStore = useTabViewsStore();
const schemaStore = useSchemaStore();

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
</script>

<template>
  <Breadcrumb>
    <BreadcrumbList class="gap-0.5!">
      <BreadcrumbItem class="text-xs">
        <Icon
          v-if="selectedWorkspace?.icon"
          :name="selectedWorkspace.icon"
          class="size-3!"
        />
        {{ selectedWorkspace?.name }}
      </BreadcrumbItem>

      <BreadcrumbSeparator v-if="selectedConnection?.id" />
      <BreadcrumbItem class="text-xs">
        <component
          v-if="selectedConnection?.id"
          :is="getDatabaseSupportByType(selectedConnection?.type)?.icon"
          class="size-3!"
        />

        {{ selectedConnection?.name }}
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
