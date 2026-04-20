<script setup lang="ts">
import { Icon, Select, SelectContent, SelectItem } from '#components';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  EnvTagBadge,
  useEnvironmentTagStore,
} from '@/components/modules/environment-tag';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { type Workspace } from '~/core/stores';
import {
  CreateConnectionModal,
  getDatabaseSupportByType,
} from '../../connection';
import { useWorkspaceCard } from '../hooks/useWorkspaceCard';
import CreateWorkspaceModal from './CreateWorkspaceModal.vue';
import DeleteWorkspaceModal from './DeleteWorkspaceModal.vue';

dayjs.extend(relativeTime);

const tagStore = useEnvironmentTagStore();

const props = defineProps<{
  workspace: Workspace;
  onOpenWorkspace?: () => void;
}>();

const emits = defineEmits<{
  (e: 'onSelectWorkspace', wsId: string): void;
}>();

const {
  workspaceStore,
  isOpenEditModal,
  isOpenDeleteModal,
  isOpenConnectionSelector,
  dropdownTriggerRef,
  isModalCreateConnectionOpen,
  connections,
  onConfirmDelete,
  onOpenWorkspace,
  onOpenConnectionSelector,
  onOpenWorkspaceWithConnection,
  handleAddConnection,
} = useWorkspaceCard({
  workspace: props.workspace,
  onSelectWorkspace: wsId => emits('onSelectWorkspace', wsId),
});
</script>

<template>
  <CreateConnectionModal
    :open="isModalCreateConnectionOpen"
    :editing-connection="null"
    @update:open="isModalCreateConnectionOpen = $event"
    @addNew="handleAddConnection"
    v-if="isModalCreateConnectionOpen"
    :workspaceId="workspace.id"
  />

  <CreateWorkspaceModal
    v-model:open="isOpenEditModal"
    :workspace="workspace"
    :workspaceSeq="workspaceStore.workspaces.length"
    v-if="isOpenEditModal"
  />

  <DeleteWorkspaceModal
    v-model:open="isOpenDeleteModal"
    @confirm="onConfirmDelete"
    v-if="isOpenDeleteModal"
  />

  <Card class="gap-4 justify-between!">
    <CardHeader class="flex justify-between px-4">
      <div class="flex items-center space-x-2">
        <Avatar>
          <AvatarFallback>
            <Icon :name="workspace.icon" class="size-5!" />
          </AvatarFallback>
        </Avatar>

        <div>
          <CardTitle class="line-clamp-1">{{ workspace.name }}</CardTitle>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button size="icon" variant="ghost">
            <Icon name="hugeicons:more-vertical-circle-01" class="size-4!" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            class="cursor-pointer flex items-center"
            @click="isOpenEditModal = true"
          >
            <Icon name="hugeicons:pencil-edit-02" class="size-4! min-w-4" />
            Edit workspace
          </DropdownMenuItem>
          <DropdownMenuItem class="cursor-pointer flex items-center" disabled>
            <Icon name="hugeicons:link-04" class="size-4! min-w-4" />
            Invite
          </DropdownMenuItem>
          <DropdownMenuItem
            class="cursor-pointer flex items-center"
            @click="isOpenDeleteModal = true"
          >
            <Icon name="hugeicons:delete-02" class="size-4! min-w-4" />
            Delete workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </CardHeader>
    <CardContent class="grid gap-4 overflow-hidden px-4">
      <div class="space-y-1">
        <p class="text-sm line-clamp-2 break-words break-all text-left">
          {{ workspace.desc }}
        </p>

        <div class="flex items-center pt-2">
          <Icon name="hugeicons:connect" class="mr-2 h-4 w-4 opacity-70" />
          <span class="text-xs text-muted-foreground">
            Connection : {{ connections.length }}
          </span>
        </div>
        <div class="flex items-center pt-2">
          <Icon name="hugeicons:clock-05" class="mr-2 h-4 w-4 opacity-70" />
          <span
            class="text-xs text-muted-foreground"
            v-if="workspace.lastOpened"
          >
            Last opened : {{ dayjs(workspace.lastOpened).fromNow() }}
          </span>
          <span class="text-xs text-muted-foreground" v-else>
            Last opened : -/-
          </span>
        </div>
        <div class="flex items-center pt-2">
          <Icon name="hugeicons:clock-01" class="mr-2 h-4 w-4 opacity-70" />
          <span class="text-xs text-muted-foreground">
            Created : {{ dayjs(workspace.createdAt).fromNow() }}
          </span>
        </div>
      </div>
    </CardContent>
    <CardFooter class="px-4">
      <Select v-model:open="isOpenConnectionSelector">
        <Button
          :id="`tour-open-workspace-${workspace.id}`"
          ref="dropdownTriggerRef"
          variant="default"
          class="w-full flex items-center justify-between"
          @click="onOpenWorkspace()"
          size="sm"
        >
          <div class="flex items-center gap-1">
            <Icon name="hugeicons:square-arrow-up-right" class="h-4 w-4" />
            Open workspace
          </div>

          <Button
            size="iconSm"
            variant="ghost"
            @click.stop="onOpenConnectionSelector()"
          >
            <Icon name="hugeicons:arrow-down-01" class="size-5!" />
          </Button>
        </Button>

        <SelectContent :reference="dropdownTriggerRef">
          <SelectGroup>
            <div
              class="flex px-2 py-0.5 h-8 hover:bg-muted rounded-md font-normal text-sm items-center gap-1 cursor-pointer"
              @click="isModalCreateConnectionOpen = true"
            >
              <Icon name="hugeicons:plus-sign" />
              Add new connection
            </div>

            <SelectSeparator v-if="connections.length" />

            <SelectItem
              class="cursor-pointer"
              :value="connection.id"
              v-for="connection in connections"
              :key="connection.id"
              @select="onOpenWorkspaceWithConnection(connection.id)"
            >
              <div class="flex items-center gap-2 min-w-0">
                <component
                  :is="getDatabaseSupportByType(connection.type)?.icon"
                  class="size-4! shrink-0"
                />
                <span class="truncate">{{ connection.name }}</span>
                <div
                  v-if="(connection.tagIds ?? []).length"
                  class="flex items-center gap-1 ml-auto flex-shrink-0"
                >
                  <EnvTagBadge
                    v-for="tag in tagStore.getTagsByIds(
                      connection.tagIds ?? []
                    )"
                    :key="tag.id"
                    :tag="tag"
                  />
                </div>
              </div>
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </CardFooter>
  </Card>
</template>
