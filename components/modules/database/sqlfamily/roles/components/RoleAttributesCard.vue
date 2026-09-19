<script setup lang="ts">
import PermissionBadge from './PermissionBadge.vue';

interface RoleInfo {
  isSuperuser: boolean;
  canLogin: boolean;
  canCreateDb: boolean;
  canCreateRole: boolean;
  isReplication: boolean;
  connectionLimit: number;
  validUntil: string | null;
  memberOf: string[];
}

interface Props {
  roleInfo: RoleInfo | null;
}

const props = defineProps<Props>();

const permissionItems = computed(() => {
  if (!props.roleInfo) return [];
  const info = props.roleInfo;
  return [
    {
      id: 'superuser',
      label: 'Superuser',
      value: info.isSuperuser,
      type: 'boolean' as const,
    },
    {
      id: 'login',
      label: 'Can Login',
      value: info.canLogin,
      type: 'boolean' as const,
    },
    {
      id: 'createdb',
      label: 'Create DB',
      value: info.canCreateDb,
      type: 'boolean' as const,
    },
    {
      id: 'createrole',
      label: 'Create Role',
      value: info.canCreateRole,
      type: 'boolean' as const,
    },
    {
      id: 'replication',
      label: 'Replication',
      value: info.isReplication,
      type: 'boolean' as const,
    },
    {
      id: 'connlimit',
      label: 'Connections',
      value:
        info.connectionLimit === -1 ? 'Unlimited' : `${info.connectionLimit}`,
      type: 'text' as const,
    },
  ];
});

const memberOfList = computed(() => {
  if (!props.roleInfo?.memberOf?.length) return [];
  return props.roleInfo.memberOf;
});
</script>

<template>
  <div class="px-4 py-3 shrink-0">
    <div class="flex items-center gap-2 mb-2">
      <Icon name="hugeicons:shield-01" class="size-4" />

      <p class="text-sm font-medium">Role Attributes</p>
    </div>

    <div v-if="roleInfo" class="flex flex-wrap gap-2">
      <PermissionBadge
        v-for="item in permissionItems"
        :key="item.id"
        :label="item.label"
        :value="item.value"
        :type="item.type"
      />

      <!-- Valid Until if present -->
      <Badge v-if="roleInfo.validUntil" variant="secondary" class="text-xs">
        <Icon name="lucide:calendar" class="size-3 mr-1" />
        Expires: {{ new Date(roleInfo.validUntil).toLocaleDateString() }}
      </Badge>
    </div>

    <!-- Member Of -->
    <div v-if="memberOfList.length" class="mt-2 text-xs text-muted-foreground">
      Member of:
      <span class="text-foreground">{{ memberOfList.join(', ') }}</span>
    </div>
  </div>
</template>
