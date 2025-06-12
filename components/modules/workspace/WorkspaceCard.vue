<script setup lang="ts">
import { Icon } from '#components';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { ClockFading, ExternalLink } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAppContext } from '~/shared/contexts/useAppContext';
import { type Workspace } from '~/shared/stores';
import CreateWorkspaceModal from './CreateWorkspaceModal.vue';
import DeleteWorkspaceModal from './DeleteWorkspaceModal.vue';

dayjs.extend(relativeTime);

const props = defineProps<{
  workspace: Workspace;
  onOpenWorkspace?: () => void;
}>();

const emits = defineEmits<{
  (e: 'onSelectWorkspace', workspaceId: string): void;
}>();

const { workspaceStore, onSelectWorkspaceById } = useAppContext();

const isOpenEditModal = ref(false);
const isOpenDeleteModal = ref(false);

const onConfirmDelete = () => {
  isOpenDeleteModal.value = false;
  workspaceStore.deleteWorkspace(props.workspace.id);
};

const onOpenWorkspace = (workspaceId: string) => {
  onSelectWorkspaceById(workspaceId);
  emits('onSelectWorkspace', workspaceId);

  // navigateTo({ name: 'workspaceId', params: { workspaceId } });
};
</script>

<template>
  <CreateWorkspaceModal
    v-model:open="isOpenEditModal"
    :workspace="workspace"
    v-if="isOpenEditModal"
  />

  <DeleteWorkspaceModal
    v-model:open="isOpenDeleteModal"
    @confirm="onConfirmDelete"
    v-if="isOpenDeleteModal"
  />

  <Card class="gap-4">
    <CardHeader class="flex justify-between">
      <div class="flex items-center space-x-2">
        <Avatar>
          <AvatarFallback>
            <Icon :name="workspace.icon" class="size-5!" />
          </AvatarFallback>
        </Avatar>

        <div>
          <CardTitle class="line-clamp-1">{{ workspace.name }}</CardTitle>
          <!-- <CardDescription>You have 3 unread messages.</CardDescription> -->
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
            <Icon name="lucide:pencil" class="size-4! min-w-4" />

            Edit workspace
          </DropdownMenuItem>
          <DropdownMenuItem class="cursor-pointer flex items-center" disabled>
            <Icon name="lucide:link" class="size-4! min-w-4" />

            Invite
          </DropdownMenuItem>
          <DropdownMenuItem
            class="cursor-pointer flex items-center"
            @click="isOpenDeleteModal = true"
          >
            <Icon name="lucide:trash" class="size-4! min-w-4" />

            Delete workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </CardHeader>
    <CardContent class="grid gap-4">
      <div class="space-y-1">
        <p class="text-sm line-clamp-2">
          {{ workspace.desc }}
        </p>

        <div class="flex items-center pt-2">
          <Icon name="lucide:users" class="mr-2 h-4 w-4 opacity-70" />
          <span class="text-xs text-muted-foreground"> You and ... </span>
          <!-- <div class="flex">
                  <Avatar class="size-4">
                    <AvatarImage
                      src="https://github.com/unovue.png"
                      alt="@unovue"
                    />
                    <AvatarFallback> U1 </AvatarFallback>
                  </Avatar>
                  <Avatar class="size-4">
                    <AvatarImage
                      src="https://github.com/"
                      alt="@unovue"
                    />
                    <AvatarFallback> U1 </AvatarFallback>
                  </Avatar>
                  <Avatar class="size-4">
                    <AvatarImage
                      src="https://github.com/unovue.png"
                      alt="@unovue"
                    />
                    <AvatarFallback> U1 </AvatarFallback>
                  </Avatar>
                </div> -->
        </div>

        <div class="flex items-center pt-2" v-if="workspace.lastOpened">
          <ClockFading class="mr-2 h-4 w-4 opacity-70" />
          <span class="text-xs text-muted-foreground">
            Last opened {{ dayjs(workspace.lastOpened).fromNow() }}
          </span>
        </div>
        <div class="flex items-center pt-2" v-else>
          <Icon name="lucide:clock" class="mr-2 h-4 w-4 opacity-70" />

          <span class="text-xs text-muted-foreground">
            Created {{ dayjs(workspace.lastOpened).fromNow() }}
          </span>
        </div>
      </div>
    </CardContent>
    <CardFooter>
      <Button
        variant="default"
        class="w-full"
        @click="onOpenWorkspace(workspace.id)"
      >
        <ExternalLink class="h-4 w-4" /> Open workspace
      </Button>
    </CardFooter>
  </Card>
</template>
