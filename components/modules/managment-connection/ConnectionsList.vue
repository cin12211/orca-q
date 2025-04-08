<template>
  <div
    v-if="connections.length === 0"
    class="rounded-md border p-10 text-center"
  >
    <DatabaseIcon class="mx-auto mb-4 h-12 w-12 text-muted-foreground/60" />
    <h3 class="mb-2 text-lg font-medium">No connections yet</h3>
    <p class="text-muted-foreground">
      Click "Add Connection" to create your first database connection.
    </p>
  </div>

  <div v-else class="rounded-md border border-border">
    <Table>
      <TableHeader>
        <TableRow class="hover:bg-transparent">
          <TableHead class="w-[250px]">Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Connection Details</TableHead>
          <TableHead>Created</TableHead>
          <TableHead class="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="connection in connections"
          :key="connection.id"
          class="hover:bg-muted/30"
        >
          <TableCell class="font-medium">
            <div class="flex items-center gap-2">
              <component
                :is="getDatabaseSupportByType(connection.type)?.icon"
                class="size-5!"
              />
              {{ connection.name }}
            </div>
          </TableCell>
          <TableCell>
            {{
              connection.type.charAt(0).toUpperCase() + connection.type.slice(1)
            }}
          </TableCell>
          <TableCell>
            <span
              v-if="connection.method === 'string'"
              class="text-muted-foreground"
            >
              {{ connection.connectionString }}
              <!-- String connection string -->
            </span>
            <span v-else class="text-muted-foreground">
              {{ connection.host }}:{{ connection.port }}
              {{ connection.database ? `/${connection.database}` : "" }}
            </span>
          </TableCell>
          <TableCell>{{ formatDate(connection.createdAt) }}</TableCell>
          <TableCell class="text-right">
            <div class="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                class="h-8 gap-1 border px-2 text-xs hover:bg-primary/5 hover:text-primary"
              >
                <ExternalLinkIcon class="h-3.5 w-3.5" />
                Connect
              </Button>
              <Button
                variant="outline"
                size="sm"
                class="h-8 border px-2 hover:bg-primary/5 hover:text-primary"
                @click="$emit('edit', connection)"
              >
                <EditIcon class="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                class="h-8 border px-2 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
                @click="openDeleteDialog(connection.id)"
              >
                <Trash2Icon class="h-3.5 w-3.5" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <AlertDialog :open="!!deleteId" @update:open="!$event && (deleteId = null)">
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

<script setup lang="ts">
import { ref } from "vue";
import {
  DatabaseIcon,
  EditIcon,
  Trash2Icon,
  ExternalLinkIcon,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EDatabaseType, type DatabaseConnection } from "./type";
import { getDatabaseSupportByType } from "./constants";

const props = defineProps<{
  connections: DatabaseConnection[];
}>();

const emit = defineEmits<{
  (e: "edit", connection: DatabaseConnection): void;
  (e: "delete", id: string): void;
}>();

const deleteId = ref<string | null>(null);

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date instanceof Date ? date : new Date(date));
};

const openDeleteDialog = (id: string) => {
  deleteId.value = id;
};

const confirmDelete = () => {
  if (deleteId.value) {
    emit("delete", deleteId.value);
    deleteId.value = null;
  }
};
</script>
