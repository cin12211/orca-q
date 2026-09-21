<script setup lang="ts">
import type {
  DatabasePermission,
  ObjectPermission,
  RolePermissions,
} from '~/core/types';
import DatabasePermissionCard from './DatabasePermissionCard.vue';

defineProps<{
  databasePermissions: DatabasePermission[];
  permissions: RolePermissions | null;
  isLoading: boolean;
  isDatabaseExpanded: (dbName: string) => boolean;
  isCurrentDatabase: (dbName: string) => boolean;
}>();

defineEmits<{
  (e: 'toggle', dbName: string): void;
  (e: 'updatePermission', permission: ObjectPermission): void;
}>();
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0 p-4 pt-0">
    <div class="flex items-center gap-2 mb-3 shrink-0">
      <Icon name="hugeicons:database" class="size-5 text-yellow-400" />
      <p class="text-sm font-medium">Database Access</p>
      <Badge variant="secondary" class="text-xs">
        {{ databasePermissions.filter(d => d.canConnect).length }}
      </Badge>
    </div>

    <div v-if="isLoading" class="flex items-center gap-2 text-muted-foreground">
      <Icon name="hugeicons:loading-03" class="size-4 animate-spin" />
      <span class="text-sm">Loading databases...</span>
    </div>

    <BaseEmpty
      v-else-if="databasePermissions.length === 0"
      title="No permissions found"
      desc="No database permissions were found for this role."
    />

    <div v-else class="space-y-1 flex-1 overflow-y-auto">
      <DatabasePermissionCard
        v-for="db in databasePermissions"
        :key="db.databaseName"
        :database="db"
        :is-expanded="isDatabaseExpanded(db.databaseName)"
        :is-current-database="isCurrentDatabase(db.databaseName)"
        :permissions="permissions"
        @toggle="$emit('toggle', db.databaseName)"
        @update-permission="$emit('updatePermission', $event)"
      />
    </div>
  </div>
</template>
