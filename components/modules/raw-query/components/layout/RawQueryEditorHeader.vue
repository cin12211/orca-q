<script setup lang="ts">
import { computed, ref, toValue, type Component } from 'vue';
import { Tooltip, TooltipContent, TooltipTrigger } from '#components';
import PureConnectionSelector from '~/components/modules/selectors/PureConnectionSelector.vue';
import { RawQueryEditorLayout } from '../../constants';
import { useRawQueryContext } from '../../hooks';
import { getRawQueryPlugin } from '../../registry';
import AddVariableModal from '../AddVariableModal.vue';
import RawQueryConfigModal from '../RawQueryConfigModal.vue';

const props = defineProps<{
  customLeftComponents?: Component[];
  customRightComponents?: Component[];
}>();

const context = useRawQueryContext();

const databaseType = computed(() => toValue(context?.databaseType));
const rawQueryPlugin = computed(() => getRawQueryPlugin(databaseType.value));
const headerConfig = computed(() => rawQueryPlugin.value?.header);

const workspaceId = computed(() => toValue(context?.workspaceId) ?? '');
const selectedConnectionId = computed(
  () => toValue(context?.selectedConnectionId) ?? ''
);
const connections = computed(() => toValue(context?.connections) ?? []);
const connection = computed(() => toValue(context?.connection));
const disableConnectionSwitch = computed(
  () => toValue(context?.disableConnectionSwitch) ?? false
);
const currentFileInfo = computed(
  () => toValue(context?.currentFileInfo) ?? toValue(context?.currentFile)
);
const fileVariables = computed(() => toValue(context?.fileVariables) ?? '');
const codeEditorLayout = computed(
  () => toValue(context?.codeEditorLayout) ?? RawQueryEditorLayout.horizontal
);

const isVariableSupported = computed(
  () => toValue(context?.isVariableSupported) ?? true
);

const handleUpdateConnectionId = (connectionId: string) => {
  context?.onUpdateConnectionId?.(connectionId);
};

const handleUpdateFileVariables = async (variables: string): Promise<void> => {
  await context?.onUpdateFileVariables?.(variables);
};

const leftComponents = computed<Component[]>(() => [
  ...(headerConfig.value?.leftComponents ?? []),
  ...(props.customLeftComponents ?? []),
]);

const rightComponents = computed<Component[]>(() => [
  ...(headerConfig.value?.rightComponents ?? []),
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
        :context="context"
      />
      <slot name="left" :context="context" />
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
        :context="context"
      />
      <slot name="right" :context="context" />

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
