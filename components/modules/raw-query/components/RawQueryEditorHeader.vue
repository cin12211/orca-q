<script setup lang="ts">
import { computed, ref, type Component } from 'vue';
import { Tooltip, TooltipContent, TooltipTrigger } from '#components';
import PureConnectionSelector from '../../selectors/PureConnectionSelector.vue';
import { RawQueryEditorLayout } from '../constants';
import { useRawQueryContext } from '../hooks';
import { getRawQueryProfile, type RawQueryHeaderContext } from '../registry';
import AddVariableModal from './AddVariableModal.vue';
import RawQueryConfigModal from './RawQueryConfigModal.vue';

const props = defineProps<{
  customLeftComponents?: Component[];
  customRightComponents?: Component[];
}>();

const context = useRawQueryContext();

const editor = computed(() => context?.rawQueryEditor);
const workspaceId = computed(() => context?.workspaceId.value ?? '');
const selectedConnectionId = computed(
  () => context?.selectedConnectionId.value ?? ''
);
const connections = computed(() => context?.connections.value ?? []);
const connection = computed(() => context?.connection.value);
const disableConnectionSwitch = computed(
  () => context?.disableConnectionSwitch.value ?? false
);
const databaseType = computed(() => context?.databaseType.value);
const currentFileInfo = computed(() => context?.currentFile.value);
const fileVariables = computed(() => context?.fileVariables.value ?? '');
const codeEditorLayout = computed(
  () => context?.codeEditorLayout.value ?? RawQueryEditorLayout.horizontal
);
const redisDatabases = computed(() => context?.redisDatabases.value ?? []);
const redisDatabaseIndex = computed(
  () => context?.redisDatabaseIndex.value ?? 0
);

const rawQueryProfile = computed(() => getRawQueryProfile(databaseType.value));
const headerProfile = computed(() => rawQueryProfile.value.header);

const isVariableSupported = computed(
  () => context?.isVariableSupported.value ?? true
);

const handleUpdateConnectionId = (connectionId: string) => {
  context?.updateSelectedConnection(connectionId);
};

const handleUpdateRedisDatabaseIndex = (databaseIndex: number) => {
  context?.updateRedisDatabaseIndex(databaseIndex);
};

const handleUpdateFileVariables = async (variables: string): Promise<void> => {
  await context?.updateFileVariables(variables);
};

const headerContext = computed<RawQueryHeaderContext>(() => ({
  workspaceId: workspaceId.value,
  selectedConnectionId: selectedConnectionId.value,
  connection: connection.value,
  connections: connections.value,
  disableConnectionSwitch: disableConnectionSwitch.value,
  databaseType: databaseType.value,
  currentFileInfo: currentFileInfo.value,
  fileVariables: fileVariables.value,
  codeEditorLayout: codeEditorLayout.value,
  redisDatabases: redisDatabases.value,
  redisDatabaseIndex: redisDatabaseIndex.value,
  rawQueryEditor: editor.value,
  editor: editor.value,
  onUpdateConnectionId: handleUpdateConnectionId,
  onUpdateRedisDatabaseIndex: handleUpdateRedisDatabaseIndex,
  onUpdateFileVariables: handleUpdateFileVariables,
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
    @updateVariables="handleUpdateFileVariables"
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
          isVariableSupported &&
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
            @update:connectionId="handleUpdateConnectionId"
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
