<script setup lang="ts">
import { useAppContext } from '~/shared/contexts';
import type { Connection } from '~/shared/stores';
import PureConnectionSelector from '../../selectors/PureConnectionSelector.vue';
import { RawQueryEditorLayout } from '../constants';
import AddVariableModal from './AddVariableModal.vue';
import RawQueryConfigModal from './RawQueryConfigModal.vue';

defineProps<{
  fileVariables: string;
  workspaceId: string;
  connectionId: string;
  connections: Connection[];
  connection?: Connection;
  codeEditorLayout: RawQueryEditorLayout;
}>();

defineEmits<{
  (e: 'update:connectionId', connectionId: string): void;
  (e: 'update:updateFileVariables', fileVariablesValue: string): Promise<void>;
}>();

const { tabViewStore } = useAppContext();

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

  <div class="flex items-center justify-between p-1 rounded-md bg-gray-50">
    <div>
      <Breadcrumb>
        <BreadcrumbList class="gap-0!">
          <BreadcrumbItem>
            <BreadcrumbLink class="flex items-center gap-0.5">
              <Icon :name="tabViewStore.activeTab?.icon" />
              {{ tabViewStore.activeTab?.name }}
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>

    <div class="flex gap-2 items-center">
      <Button
        @click="openAddVariableModal"
        variant="outline"
        size="sm"
        class="h-6 px-2 gap-1 font-normal relative"
        v-if="codeEditorLayout === RawQueryEditorLayout.horizontal"
      >
        <Icon
          name="lucide:triangle-alert"
          class="absolute -top-1 -right-1 text-red-400"
          v-if="isVariableError"
        />
        <Icon name="hugeicons:absolute" /> Add variables
      </Button>
      <PureConnectionSelector
        :connectionId="connectionId"
        @update:connectionId="$emit('update:connectionId', $event)"
        :connections="connections"
        :connection="connection"
        class="w-16 h-6! px-1.5"
        :workspaceId="workspaceId"
      />

      <Button @click="openConfigModal" variant="outline" size="iconSm">
        <Icon name="hugeicons:dashboard-square-02" />
      </Button>

      <!-- <Button @click="openAddVariableModal" variant="outline" size="iconSm">
        <Icon name="hugeicons:settings-01" />
      </Button> -->
    </div>
  </div>
</template>
