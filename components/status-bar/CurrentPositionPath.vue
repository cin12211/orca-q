<script setup lang="ts">
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '#components';
import { useAppContext } from '~/shared/contexts/useAppContext';
import { getDatabaseSupportByType } from '../modules/connection/constants';

const { workspaceStore, connectionStore, tabViewStore, schemaStore } =
  useAppContext();

const { selectedWorkspace } = toRefs(workspaceStore);
const { selectedConnection } = toRefs(connectionStore);
const { activeSchema } = toRefs(schemaStore);
const { activeTab } = toRefs(tabViewStore);

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

      <BreadcrumbSeparator v-if="isShowSchemaName" />
      <BreadcrumbItem class="text-xs" v-if="isShowSchemaName">
        {{ activeSchema?.name }}
      </BreadcrumbItem>

      <BreadcrumbSeparator v-if="isShowTabName" />
      <BreadcrumbItem class="text-xs" v-if="isShowTabName">
        {{ activeTab?.name }}
      </BreadcrumbItem>
    </BreadcrumbList>
  </Breadcrumb>
</template>
