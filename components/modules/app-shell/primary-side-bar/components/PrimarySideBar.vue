<script setup lang="ts">
import {
  ManagementErdDiagram,
  ManagementExplorer,
  ManagementSchemas,
  ManagementDatabaseTools,
  ManagementUsersAndPermission,
  ManagementAgent,
  ManagementRedisBrowser,
  ManagementRedisTools,
} from '#components';
import {
  type ConnectionActivityItem,
  getConnectionCapabilityProfile,
  resolveConnectionFamily,
} from '~/core/constants/connection-capabilities';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { useManagementConnectionStore } from '~/core/stores';
import { useAppConfigStore } from '~/core/stores/appConfigStore';
import {
  ActivityBarItemType,
  useActivityBarStore,
} from '~/core/stores/useActivityBarStore';
import {
  EConnectionFamily,
  EConnectionMethod,
} from '~/core/types/entities/connection.entity';

const ACTIVITY_ITEM_MAP: Record<ConnectionActivityItem, ActivityBarItemType> = {
  Explorer: ActivityBarItemType.Explorer,
  Schemas: ActivityBarItemType.Schemas,
  ERDiagram: ActivityBarItemType.ErdDiagram,
  UsersRoles: ActivityBarItemType.UsersRoles,
  DatabaseTools: ActivityBarItemType.DatabaseTools,
  Agent: ActivityBarItemType.Agent,
};

const DEFAULT_CONNECTION_CONTEXT = {
  type: DatabaseClientType.POSTGRES,
  method: EConnectionMethod.STRING,
};

type SidebarPlaceholderCopy = {
  eyebrow: string;
  title: string;
  description: string;
};

const activityStore = useActivityBarStore();
const managementConnectionStore = useManagementConnectionStore();

const appConfigStore = useAppConfigStore();

const capabilityProfile = computed(() =>
  getConnectionCapabilityProfile(
    managementConnectionStore.selectedConnection ?? DEFAULT_CONNECTION_CONTEXT
  )
);

const visibleActivityItems = computed(() =>
  capabilityProfile.value.visibleActivityItems.map(
    item => ACTIVITY_ITEM_MAP[item]
  )
);

const currentFamily = computed(() =>
  resolveConnectionFamily(
    managementConnectionStore.selectedConnection ?? DEFAULT_CONNECTION_CONTEXT
  )
);

watch(
  capabilityProfile,
  profile => {
    activityStore.ensureActivityVisible(
      visibleActivityItems.value,
      ACTIVITY_ITEM_MAP[profile.defaultActivityItem]
    );
  },
  {
    immediate: true,
  }
);

const current = computed(() => {
  if (currentFamily.value === EConnectionFamily.REDIS) {
    if (activityStore.activityActive === ActivityBarItemType.Explorer) {
      return ManagementExplorer;
    }

    if (activityStore.activityActive === ActivityBarItemType.Schemas) {
      return ManagementRedisBrowser;
    }

    if (activityStore.activityActive === ActivityBarItemType.DatabaseTools) {
      return ManagementRedisTools;
    }

    if (activityStore.activityActive === ActivityBarItemType.Agent) {
      return ManagementAgent;
    }

    return null;
  }

  if (activityStore.activityActive === ActivityBarItemType.Explorer) {
    return ManagementExplorer;
  }
  if (activityStore.activityActive === ActivityBarItemType.Schemas) {
    return ManagementSchemas;
  }
  if (activityStore.activityActive === ActivityBarItemType.ErdDiagram) {
    return ManagementErdDiagram;
  }
  if (activityStore.activityActive === ActivityBarItemType.UsersRoles) {
    return ManagementUsersAndPermission;
  }
  if (activityStore.activityActive === ActivityBarItemType.DatabaseTools) {
    return ManagementDatabaseTools;
  }
  if (activityStore.activityActive === ActivityBarItemType.Agent) {
    return ManagementAgent;
  }

  return null;
});

const placeholderCopy = computed<SidebarPlaceholderCopy | null>(() => {
  return null;
});
</script>

<template>
  <div class="w-full h-full flex flex-col" v-if="appConfigStore.layoutSize[0]">
    <KeepAlive v-if="current">
      <component :is="current"></component>
    </KeepAlive>

    <div
      v-else-if="placeholderCopy"
      class="h-full px-4 py-5 flex flex-col gap-3 text-sm text-muted-foreground"
    >
      <span
        class="text-xs font-medium uppercase tracking-[0.18em] text-primary/70"
      >
        {{ placeholderCopy.eyebrow }}
      </span>
      <h2 class="text-base font-semibold text-foreground">
        {{ placeholderCopy.title }}
      </h2>
      <p class="leading-6">
        {{ placeholderCopy.description }}
      </p>
    </div>
  </div>
</template>
