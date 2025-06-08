<script setup lang="ts">
import { Select, SelectGroup, SelectItem, SelectTrigger } from '#components';
import type { AcceptableValue } from 'reka-ui';
import { cn } from '@/lib/utils';
import { useAppContext } from '~/shared/contexts/useAppContext';

const { workspaceStore } = useAppContext();

const { workspaces, selectedWorkspaceId, selectedWorkspace } =
  toRefs(workspaceStore);

const props = defineProps<{ class?: string }>();

const onChangeConnection = async (connectionId: AcceptableValue) => {
  if (
    typeof connectionId === 'string' &&
    connectionId !== selectedWorkspaceId.value
  ) {
    selectedWorkspaceId.value = connectionId;
  }
};
</script>
<template>
  <Select
    @update:model-value="onChangeConnection"
    :model-value="selectedWorkspaceId"
  >
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
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
