<script setup lang="ts">
import { Select, SelectGroup, SelectItem, SelectTrigger } from '#components';
import type { AcceptableValue } from 'reka-ui';
import { cn } from '@/lib/utils';
import { useAppContext } from '~/shared/contexts/useAppContext';

const {
  workspaceStore,
  //setActiveWSId,
  wsStateStore,
} = useAppContext();

const { workspaces, selectedWorkspace } = toRefs(workspaceStore);
const { workspaceId } = toRefs(wsStateStore);

const props = defineProps<{ class?: string }>();

const onChangeWorkspace = async (wsId: AcceptableValue) => {
  if (typeof wsId === 'string' && wsId !== workspaceId.value) {
    // TODO: fix this bugs when usage workspace selector
    // setActiveWSId(wsId);
  }
};

const onBackToWorkspaces = async () => {
  await navigateTo('/');

  // setActiveWSId({
  //   connId: undefined,
  //   wsId: undefined,
  // });
};
</script>
<template>
  <Select @update:model-value="onChangeWorkspace" :model-value="workspaceId">
    <SelectTrigger :class="cn(props.class, 'cursor-pointer')" size="sm">
      <div class="flex items-center gap-2 truncate" v-if="selectedWorkspace">
        <Icon :name="selectedWorkspace.icon" />
        {{ selectedWorkspace.name }}
      </div>
      <div class="opacity-50" v-else>Select workspace</div>
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectItem
          class="cursor-pointer"
          :value="workspace.id"
          v-for="workspace in workspaces"
        >
          <div class="flex items-center gap-2">
            <Icon :name="workspace.icon" />

            {{ workspace.name }}
          </div>
        </SelectItem>

        <SelectSeparator />

        <div
          class="flex px-2 py-0.5 h-8 hover:bg-muted rounded-md font-normal text-sm items-center gap-1 cursor-pointer"
          @click="onBackToWorkspaces"
        >
          <Icon name="hugeicons:arrow-turn-backward" />

          Back to workspaces
        </div>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
