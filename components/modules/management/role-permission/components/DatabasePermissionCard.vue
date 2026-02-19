<script setup lang="ts">
import type {
  DatabasePermission,
  ObjectPermission,
  RolePermissions,
} from '~/core/types';
import PermissionBadge from './PermissionBadge.vue';

interface Props {
  database: DatabasePermission;
  isExpanded: boolean;
  isCurrentDatabase: boolean;
  permissions: RolePermissions | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'toggle'): void;
  (e: 'updatePermission', permission: ObjectPermission): void;
}>();

// Per-database active tab state
const activeTab = ref<'tables' | 'schemas' | 'functions' | 'views'>('tables');

const tabs = [
  { id: 'schemas' as const, label: 'Schemas', icon: 'hugeicons:folder-02' },
  { id: 'tables' as const, label: 'Tables', icon: 'hugeicons:grid-table' },
  { id: 'views' as const, label: 'Views', icon: 'hugeicons:property-view' },
  { id: 'functions' as const, label: 'Functions', icon: 'gravity-ui:function' },
];

const currentPermissions = computed(() => {
  if (!props.permissions) return [];

  switch (activeTab.value) {
    case 'schemas':
      return props.permissions.schemaPermissions;
    case 'tables':
      return props.permissions.tablePermissions;
    case 'views':
      return props.permissions.viewPermissions;
    case 'functions':
      return props.permissions.functionPermissions;

    default:
      return [];
  }
});

const permissionCounts = computed(() => ({
  tables: props.permissions?.tablePermissions.length ?? 0,
  schemas: props.permissions?.schemaPermissions.length ?? 0,
  views: props.permissions?.viewPermissions.length ?? 0,
  functions: props.permissions?.functionPermissions.length ?? 0,
}));

const getObjectIcon = (objectType: ObjectPermission['objectType']) => {
  switch (objectType) {
    case 'table':
      return 'hugeicons:grid-table';
    case 'schema':
      return 'hugeicons:folder-02';
    case 'view':
      return 'hugeicons:property-view';
    case 'function':
      return 'gravity-ui:function';
    default:
      return 'hugeicons:knight-shield';
  }
};

const dbPermissionItems = computed(() => [
  {
    id: 'connect',
    label: 'CONNECT',
    value: props.database.canConnect,
    type: 'boolean' as const,
  },
  {
    id: 'create',
    label: 'CREATE',
    value: props.database.canCreate,
    type: 'boolean' as const,
  },
  {
    id: 'temp',
    label: 'TEMP',
    value: props.database.canTemp,
    type: 'boolean' as const,
  },
]);
</script>

<template>
  <div class="rounded-md border">
    <!-- Header -->
    <div
      :class="[
        'flex items-center gap-1 px-3 py-2 cursor-pointer hover:bg-accent/50',
        !database.canConnect && 'opacity-50 cursor-not-allowed',
      ]"
      @click="database.canConnect && emit('toggle')"
    >
      <Icon
        :name="
          isExpanded ? 'hugeicons:arrow-down-01' : 'hugeicons:arrow-right-01'
        "
        :class="[
          'size-4 transition-transform',
          !database.canConnect && 'invisible',
        ]"
      />
      <Icon
        :name="
          database.canConnect
            ? 'hugeicons:database'
            : 'hugeicons:database-locked'
        "
        :class="[
          'size-4',
          database.canConnect ? 'text-yellow-400' : 'text-muted-foreground',
        ]"
      />
      <span
        :class="[
          'text-sm font-medium',
          !database.canConnect && 'text-muted-foreground',
        ]"
      >
        {{ database.databaseName }}
      </span>
      <Icon
        v-if="!database.canConnect"
        name="hugeicons:circle-lock-01"
        class="size-3 text-muted-foreground ml-auto"
      />
      <div v-else class="ml-auto flex gap-1">
        <Badge v-if="database.canConnect" variant="outline" class="text-xs"
          >CONNECT</Badge
        >
        <Badge v-if="database.canCreate" variant="outline" class="text-xs"
          >CREATE</Badge
        >
        <Badge v-if="database.canTemp" variant="outline" class="text-xs"
          >TEMP</Badge
        >
      </div>
    </div>

    <!-- Expanded Content -->
    <div
      v-if="isExpanded && database.canConnect"
      class="border-t bg-muted/20 p-3"
    >
      <!-- Database-level privileges -->
      <div class="px-3 py-2 border-b border-border/50">
        <p class="text-xs text-muted-foreground mb-2">
          Database-level privileges:
        </p>
        <div class="flex flex-wrap gap-2">
          <PermissionBadge
            v-for="item in dbPermissionItems"
            :key="item.id"
            :label="item.label"
            :value="item.value"
            :type="item.type"
          />
        </div>
      </div>

      <!-- Object Permissions -->
      <template v-if="isCurrentDatabase">
        <!-- Tabs -->
        <div class="flex border-b border-border/50">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="[
              'flex items-center gap-1 px-3 py-1.5 text-xs transition-colors cursor-pointer',
              activeTab === tab.id
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            ]"
            @click="activeTab = tab.id"
          >
            <Icon :name="tab.icon" class="size-3" />
            {{ tab.label }}
            <Badge variant="secondary" class="ml-1 text-xs px-1 py-0">
              {{ permissionCounts[tab.id] }}
            </Badge>
          </button>
        </div>

        <!-- Tab Content -->
        <div class="max-h-[350px] overflow-y-auto">
          <div
            v-if="!currentPermissions.length"
            class="flex flex-col items-center justify-center py-6 text-muted-foreground"
          >
            <Icon
              name="hugeicons:knight-shield"
              class="size-8 mb-1 opacity-50"
            />
            <p class="text-xs">No {{ activeTab }} permissions</p>
          </div>

          <div v-else class="divide-y divide-border/50">
            <div
              v-for="(perm, index) in currentPermissions"
              :key="`${perm.schemaName}-${perm.objectName}-${index}`"
              class="group flex items-center gap-2 px-3 py-2 hover:bg-accent/30"
            >
              <Icon
                :name="getObjectIcon(perm.objectType)"
                class="size-4 text-muted-foreground shrink-0"
              />

              <div class="flex-1 min-w-0">
                <p class="text-xs font-medium truncate">
                  <span class="text-muted-foreground"
                    >{{ perm.schemaName }}.</span
                  >{{ perm.objectName }}
                </p>
              </div>

              <div class="flex items-center gap-0.5">
                <Badge
                  v-for="value in perm.privileges"
                  variant="outline"
                  class="text-xs normal-case"
                >
                  {{ value }}
                </Badge>

                <!-- <Badge
                  v-if="perm.isGrantable"
                  variant="secondary"
                  class="text-xs px-1 py-0"
                >
                  GRANT
                </Badge> -->
              </div>

              <!-- Revoke Button -->
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      @click.stop="emit('updatePermission', perm)"
                    >
                      <Icon name="hugeicons:pencil-edit-02" class="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Update Permission</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </template>

      <!-- Not current database message -->
      <div
        v-else
        class="flex items-center gap-2 p-3 text-xs text-muted-foreground bg-muted/30 rounded"
      >
        <Icon name="hugeicons:information-circle" class="size-4" />
        <span
          >Connect to this database to view tables, schemas, and functions
          permissions.</span
        >
      </div>
    </div>
  </div>
</template>
