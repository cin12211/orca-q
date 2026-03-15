<script setup lang="ts">
import { ref } from 'vue';
import { Tooltip, TooltipContent, TooltipTrigger } from '#components';
import dayjs from 'dayjs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppContext } from '~/core/contexts/useAppContext';
import { useTabViewsStore, type Connection } from '~/core/stores';
import { getDatabaseSupportByType } from '../constants';

const { tabViewStore, openWorkspaceWithConnection } = useAppContext();

defineProps<{
  connections: Connection[];
}>();

const emit = defineEmits<{
  (e: 'edit', connection: Connection): void;
  (e: 'delete', id: string): void;
  (e: 'create'): void;
}>();

const deleteId = ref<string | null>(null);

const formatDate = (date: Date) => {
  return dayjs(date).format('DD/MM/YYYY HH:mm');
};

const openDeleteDialog = (id: string) => {
  deleteId.value = id;
};

const confirmDelete = () => {
  if (deleteId.value) {
    emit('delete', deleteId.value);
    deleteId.value = null;
  }
};

const onConnectConnection = (connection: Connection) => {
  openWorkspaceWithConnection({
    connId: connection.id,
    wsId: connection.workspaceId,
  });

  // setConnectionId({
  //   connectionId: connection.id,
  //   async onSuccess() {
  //     await tabViewStore.onActiveCurrentTab(connection.id);
  //   },
  // });
};
</script>

<template>
  <BaseEmpty
    v-if="connections.length === 0"
    title="No connections yet"
    desc="Click Add Connection to create your first database connection."
  >
    <Button size="sm" variant="outline" @click="emit('create')">
      <Icon name="hugeicons:plus-sign" class="size-4!" />
      Add Connection
    </Button>
  </BaseEmpty>

  <div v-else class="rounded-md border border-border w-full">
    <Table>
      <TableHeader>
        <TableRow class="hover:bg-transparent">
          <TableHead>Name</TableHead>
          <!-- <TableHead>Type</TableHead> -->
          <TableHead>Connection Details</TableHead>
          <!-- <TableHead>Created</TableHead> -->
          <TableHead class="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="connection in connections"
          :key="connection.id"
          class="hover:bg-muted/30 w-full"
        >
          <TableCell>
            <div class="flex items-center gap-2 truncate">
              <component
                :is="getDatabaseSupportByType(connection.type)?.icon"
                class="size-5!"
              />
              {{ connection.name }}
            </div>
          </TableCell>
          <!-- <TableCell>
            {{
              connection.type.charAt(0).toUpperCase() + connection.type.slice(1)
            }}
          </TableCell> -->
          <TableCell>
            <Tooltip>
              <TooltipTrigger as-child>
                <div class="w-80">
                  <div
                    v-if="connection.method === 'string'"
                    class="text-muted-foreground truncate"
                  >
                    {{ connection.connectionString }}
                    <!-- String connection string -->
                  </div>
                  <div v-else class="text-muted-foreground">
                    {{ connection.host }}:{{ connection.port }}
                    {{ connection.database ? `/${connection.database}` : '' }}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p v-if="connection.method === 'string'">
                  {{ connection.connectionString }}
                  <!-- String connection string -->
                </p>
                <p v-else>
                  {{ connection.host }}:{{ connection.port }}
                  {{ connection.database ? `/${connection.database}` : '' }}
                </p>
              </TooltipContent>
            </Tooltip>
          </TableCell>
          <!-- <TableCell>{{ formatDate(connection.createdAt) }}</TableCell> -->
          <TableCell class="text-right">
            <div class="flex items-center justify-end gap-1">
              <Button
                variant="outline"
                size="iconMd"
                @click="$emit('edit', connection)"
              >
                <Icon name="hugeicons:edit-02" />
              </Button>
              <Button
                variant="outline"
                size="iconMd"
                @click="openDeleteDialog(connection.id)"
              >
                <Icon name="hugeicons:delete-02" />
              </Button>

              <Button
                variant="default"
                size="sm"
                @click="onConnectConnection(connection)"
              >
                <Icon name="hugeicons:square-arrow-up-right" />
                Connect
              </Button>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <AlertDialog :open="!!deleteId" @update:open="!$event">
      <AlertDialogContent class="border">
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this database connection. This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel class="border" @click="deleteId = null"
            >Cancel</AlertDialogCancel
          >
          <AlertDialogAction
            class="border bg-red-600 hover:bg-red-700"
            @click="confirmDelete"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
