<script setup lang="ts">
import { computed, h, ref } from 'vue';
import { Icon, Tooltip, TooltipContent, TooltipTrigger } from '#components';
import dayjs from 'dayjs';
import {
  EnvTagBadge,
  useEnvironmentTagStore,
  useStrictModeGuard,
} from '@/components/modules/environment-tag';
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
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { useAppContext } from '~/core/contexts/useAppContext';
import { parseConnectionString } from '~/core/helpers/parser-connection-string';
import { type Connection } from '~/core/stores';
import { EConnectionMethod } from '~/core/types/entities/connection.entity';
import { getDatabaseSupportByType } from '../constants';

const { openWorkspaceWithConnection } = useAppContext();
const tagStore = useEnvironmentTagStore();
const { checkAndConfirm } = useStrictModeGuard();

const props = defineProps<{
  connections: Connection[];
}>();

const emit = defineEmits<{
  (e: 'edit', connection: Connection): void;
  (e: 'delete', id: string): void;
  (e: 'create'): void;
}>();

const deleteId = ref<string | null>(null);
const fallbackDatabaseIcon = h(Icon, { name: 'hugeicons:database' });

const formatDate = (date: Date) => {
  return dayjs(date).format('DD/MM/YYYY HH:mm');
};

const getParsedConnection = (connection: Connection) => {
  if (
    connection.method !== EConnectionMethod.STRING ||
    !connection.connectionString
  ) {
    return null;
  }

  try {
    return parseConnectionString(connection.connectionString);
  } catch {
    return null;
  }
};

const getFormTarget = (connection: Connection) => {
  if (connection.type === DatabaseClientType.ORACLE) {
    return connection.serviceName;
  }

  return connection.database;
};

const getConnectionDetails = (connection: Connection) => {
  if (connection.method === EConnectionMethod.FILE) {
    const filePath = connection.filePath || 'SQLite file not selected';

    return {
      summary: filePath,
      tooltip: filePath,
    };
  }

  if (connection.method === EConnectionMethod.STRING) {
    const parsed = getParsedConnection(connection);
    const fallback = connection.connectionString || 'Invalid connection string';

    if (!parsed) {
      return {
        summary: fallback,
        tooltip: fallback,
      };
    }

    return {
      summary: `${parsed.host}${parsed.database ? `:${parsed.database}` : ''}`,
      tooltip: `${parsed.host}${parsed.port ? `:${parsed.port}` : ''}${parsed.database ? `/${parsed.database}` : ''}`,
    };
  }

  const host = connection.host || 'Host not set';
  const target = getFormTarget(connection);

  return {
    summary: `${host}${target ? `:${target}` : ''}`,
    tooltip: `${host}${connection.port ? `:${connection.port}` : ''}${target ? `/${target}` : ''}`,
  };
};

const connectionsWithDetails = computed(() =>
  props.connections.map(connection => ({
    connection,
    details: getConnectionDetails(connection),
    icon:
      getDatabaseSupportByType(connection.type)?.icon ?? fallbackDatabaseIcon,
  }))
);

const openDeleteDialog = (id: string) => {
  deleteId.value = id;
};

const confirmDelete = () => {
  if (deleteId.value) {
    emit('delete', deleteId.value);
    deleteId.value = null;
  }
};

const onConnectConnection = async (connection: Connection) => {
  const ok = await checkAndConfirm(connection);
  if (!ok) return;

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
    v-if="props.connections.length === 0"
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
          <TableHead>Tag Envs</TableHead>
          <!-- <TableHead>Created</TableHead> -->
          <TableHead class="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="item in connectionsWithDetails"
          :key="item.connection.id"
          class="hover:bg-muted/30 w-full"
        >
          <TableCell>
            <div class="flex items-center gap-2 truncate">
              <component :is="item.icon" class="size-5!" />
              {{ item.connection.name }}
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
                  <div class="text-muted-foreground truncate">
                    {{ item.details.summary }}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{{ item.details.tooltip }}</p>
              </TooltipContent>
            </Tooltip>
          </TableCell>
          <!-- <TableCell>{{ formatDate(connection.createdAt) }}</TableCell> -->
          <TableCell>
            <div class="flex flex-wrap gap-1">
              <EnvTagBadge
                v-for="tag in tagStore.getTagsByIds(
                  item.connection.tagIds ?? []
                )"
                :key="tag.id"
                :tag="tag"
              />
            </div>
          </TableCell>
          <TableCell class="text-right">
            <div class="flex items-center justify-end gap-1">
              <Button
                variant="outline"
                size="iconMd"
                @click="$emit('edit', item.connection)"
              >
                <Icon name="hugeicons:edit-02" />
              </Button>
              <Button
                variant="outline"
                size="iconMd"
                @click="openDeleteDialog(item.connection.id)"
              >
                <Icon name="hugeicons:delete-02" />
              </Button>

              <Button
                variant="default"
                size="sm"
                @click="onConnectConnection(item.connection)"
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
