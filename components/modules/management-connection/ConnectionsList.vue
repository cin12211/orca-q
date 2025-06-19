<script setup lang="ts">
import { ref } from 'vue';
import { Tooltip, TooltipContent, TooltipTrigger } from '#components';
import dayjs from 'dayjs';
import { EditIcon, Trash2Icon, ExternalLinkIcon } from 'lucide-vue-next';
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
import { useAppContext } from '~/shared/contexts/useAppContext';
import { useTabViewsStore, type Connection } from '~/shared/stores';
import { getDatabaseSupportByType } from './constants';

const { setConnectionId } = useAppContext();

const tabViewStore = useTabViewsStore();

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
  setConnectionId({
    connectionId: connection.id,
    async onSuccess() {
      await tabViewStore.onActiveCurrentTab();
    },
  });
};
</script>

<template>
  <div
    v-if="connections.length === 0"
    class="rounded-md border p-10 text-center"
  >
    <Icon
      class="mx-auto mb-2 size-20! text-muted-foreground"
      name="lucide:database"
    />
    <h3 class="text-lg font-medium">No connections yet</h3>
    <p class="text-muted-foreground">
      Click "Add Connection" to create your first database connection.
    </p>

    <Button size="sm" variant="outline" class="mt-4" @click="emit('create')">
      <Icon name="lucide:plus" class="size-4!" />
      Add Connection
    </Button>
  </div>

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
                variant="secondary"
                size="iconMd"
                @click="$emit('edit', connection)"
              >
                <EditIcon class="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="secondary"
                size="iconMd"
                @click="openDeleteDialog(connection.id)"
              >
                <Trash2Icon class="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="default"
                size="sm"
                @click="onConnectConnection(connection)"
              >
                <ExternalLinkIcon class="h-3.5 w-3.5" />
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
