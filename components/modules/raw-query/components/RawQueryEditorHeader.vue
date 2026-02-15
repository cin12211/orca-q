<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipTrigger } from '#components';
import { type Connection, type RowQueryFile } from '~/core/stores';
import PureConnectionSelector from '../../selectors/PureConnectionSelector.vue';
import { RawQueryEditorLayout } from '../constants';
import AddVariableModal from './AddVariableModal.vue';
import RawQueryConfigModal from './RawQueryConfigModal.vue';

defineProps<{
  currentFileInfo?: RowQueryFile;
  fileVariables: string;
  workspaceId: string;
  connections: Connection[];
  connection?: Connection;
  codeEditorLayout: RawQueryEditorLayout;
}>();

defineEmits<{
  (e: 'update:connectionId', connectionId: string): void;
  (e: 'update:updateFileVariables', fileVariablesValue: string): Promise<void>;
}>();

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

  <!-- {{ currentFileInfo }} -->
  <div class="flex items-center justify-between p-1 rounded-md bg-gray-50">
    <div>
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
    </div>

    <div class="flex gap-2 items-center">
      <Tooltip v-if="codeEditorLayout === RawQueryEditorLayout.horizontal">
        <TooltipTrigger as-child>
          <Button
            @click="openAddVariableModal"
            variant="outline"
            size="xs"
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
            :connectionId="currentFileInfo?.connectionId || ''"
            @update:connectionId="$emit('update:connectionId', $event)"
            :connections="connections"
            :connection="connection"
            class="w-16 h-6! px-1.5"
            :workspaceId="workspaceId"
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Select connection</p>
        </TooltipContent>
      </Tooltip>

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

      <!-- <Button @click="openAddVariableModal" variant="outline" size="iconSm">
        <Icon name="hugeicons:settings-01" />
      </Button> -->
    </div>
  </div>
</template>
