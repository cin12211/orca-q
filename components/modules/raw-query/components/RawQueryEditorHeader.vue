<script setup lang="ts">
import { computed, ref, type Component } from 'vue';
import { Tooltip, TooltipContent, TooltipTrigger } from '#components';
import RedisDBSelector from '~/components/modules/selectors/RedisDBSelector.vue';
import type { DatabaseClientType } from '~/core/constants/database-client-type';
import { type Connection, type RowQueryFile } from '~/core/stores';
import type { RedisDatabaseOption } from '~/core/types/redis-workspace.types';
import PureConnectionSelector from '../../selectors/PureConnectionSelector.vue';
import { RawQueryEditorLayout } from '../constants';
import { getRawQueryProfile, type RawQueryHeaderContext } from '../registry';
import AddVariableModal from './AddVariableModal.vue';
import RawQueryConfigModal from './RawQueryConfigModal.vue';

const props = defineProps<{
  currentFileInfo?: RowQueryFile;
  fileVariables: string;
  workspaceId: string;
  selectedConnectionId: string;
  disableConnectionSwitch: boolean;
  connections: Connection[];
  connection?: Connection;
  databaseType?: DatabaseClientType;
  isRedisConnection?: boolean;
  isMongoConnection?: boolean;
  isSupportVariable?: boolean;
  redisDatabases?: RedisDatabaseOption[];
  redisDatabaseIndex?: number;
  codeEditorLayout: RawQueryEditorLayout;
  customLeftComponents?: Component[];
  customRightComponents?: Component[];
}>();

const emit = defineEmits<{
  (e: 'update:connectionId', connectionId: string): void;
  (e: 'update:redisDatabaseIndex', databaseIndex: number): void;
  (e: 'update:updateFileVariables', fileVariablesValue: string): Promise<void>;
}>();

const effectiveDatabaseType = computed(
  () =>
    props.databaseType ??
    (props.connection?.type as DatabaseClientType | undefined)
);

const rawQueryProfile = computed(() =>
  getRawQueryProfile(effectiveDatabaseType.value)
);
const headerProfile = computed(() => rawQueryProfile.value.header);

const supportsVariables = computed(() =>
  headerProfile.value.supportsVariables !== undefined
    ? headerProfile.value.supportsVariables
    : props.isSupportVariable
);

const headerContext = computed<RawQueryHeaderContext>(() => ({
  workspaceId: props.workspaceId,
  selectedConnectionId: props.selectedConnectionId,
  connection: props.connection,
  connections: props.connections,
  disableConnectionSwitch: props.disableConnectionSwitch,
  databaseType: effectiveDatabaseType.value,
  currentFileInfo: props.currentFileInfo,
  fileVariables: props.fileVariables,
  codeEditorLayout: props.codeEditorLayout,
  redisDatabases: props.redisDatabases,
  redisDatabaseIndex: props.redisDatabaseIndex,
  onUpdateConnectionId: (connectionId: string) =>
    emit('update:connectionId', connectionId),
  onUpdateRedisDatabaseIndex: (databaseIndex: number) =>
    emit('update:redisDatabaseIndex', databaseIndex),
  onUpdateFileVariables: (variables: string) =>
    emit('update:updateFileVariables', variables),
}));

const leftComponents = computed<Component[]>(() => [
  ...(headerProfile.value.leftComponents ?? []),
  ...(props.customLeftComponents ?? []),
]);

const rightComponents = computed<Component[]>(() => [
  ...(headerProfile.value.rightComponents ?? []),
  ...(props.customRightComponents ?? []),
]);

const isOpenAddVariableModal = ref(false);
const isOpenConfigModal = ref(false);
const isVariableError = ref(false);

const openAddVariableModal = () => {
  isOpenAddVariableModal.value = true;
};

const openConfigModal = () => {
  isOpenConfigModal.value = true;
};
</script>

<template>
  <AddVariableModal
    @updateVariables="$emit('update:updateFileVariables', $event)"
    :file-variables="fileVariables"
    v-model:open="isOpenAddVariableModal"
  />
  <RawQueryConfigModal v-model:open="isOpenConfigModal" />

  <div class="flex items-center justify-between p-1 rounded-md bg-muted">
    <!-- Left Zone: Breadcrumb + Left Header Components -->
    <div class="flex items-center gap-2">
      <Breadcrumb>
        <BreadcrumbList class="gap-0!">
          <BreadcrumbItem>
            <BreadcrumbLink class="flex items-center gap-0.5">
              <Icon :name="currentFileInfo?.icon" />
              {{ currentFileInfo?.title }}
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <component
        v-for="(comp, index) in leftComponents"
        :key="`left-${index}`"
        :is="comp"
        :context="headerContext"
      />
      <slot name="left" :context="headerContext" />
    </div>

    <!-- Right Zone: Actions, Selectors, Right Header Components, Settings -->
    <div class="flex gap-2 items-center">
      <!-- Query variables button if supported by layout and profile -->
      <Tooltip
        v-if="
          supportsVariables &&
          codeEditorLayout === RawQueryEditorLayout.horizontal
        "
      >
        <TooltipTrigger as-child>
          <Button
            @click="openAddVariableModal"
            variant="outline"
            size="xxs"
            class="relative"
          >
            <Icon
              name="lucide:triangle-alert"
              class="absolute -top-1 -right-1 text-red-400"
              v-if="isVariableError"
            />
            <Icon name="hugeicons:absolute" /> Add variables
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Add variables</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger as-child>
          <PureConnectionSelector
            :connectionId="selectedConnectionId"
            @update:connectionId="$emit('update:connectionId', $event)"
            :connections="connections"
            :connection="connection"
            :disabled="disableConnectionSwitch"
            class="w-fit h-6! px-1.5"
            :workspaceId="workspaceId"
          />
        </TooltipTrigger>
        <TooltipContent>
          <p v-if="disableConnectionSwitch">
            Connection switch is locked because the current connection has a
            strict mode tag
          </p>
          <p v-else>Select connection</p>
        </TooltipContent>
      </Tooltip>

      <!-- Registry-driven right header components (e.g. Redis DB Selector) -->
      <component
        v-for="(comp, index) in rightComponents"
        :key="`right-${index}`"
        :is="comp"
        :context="headerContext"
      />
      <!-- Fallback if rightComponents is empty and isRedisConnection is true -->
      <RedisDBSelector
        v-if="rightComponents.length === 0 && isRedisConnection"
        compact
        trigger-id="raw-query-redis-db-index"
        trigger-class="bg-background"
        :databases="redisDatabases || []"
        :database-index="redisDatabaseIndex ?? 0"
        @update:database-index="$emit('update:redisDatabaseIndex', $event)"
      />
      <slot name="right" :context="headerContext" />

      <Tooltip>
        <TooltipTrigger as-child>
          <Button @click="openConfigModal" variant="outline" size="iconSm">
            <Icon name="hugeicons:dashboard-square-02" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Query Settings</p>
        </TooltipContent>
      </Tooltip>
    </div>
  </div>
</template>
