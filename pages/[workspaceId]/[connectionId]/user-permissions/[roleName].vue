<script setup lang="ts">
import { RolePermissionDetailContainer } from '~/components/modules/driver/postgres/user-permissions';

definePageMeta({
  keepalive: true,
});

const route = useRoute('workspaceId-connectionId-user-permissions-roleName');

const roleName = computed(() => route.params.roleName as string);
</script>

<template>
  <RolePermissionDetailContainer :role-name="roleName" />
</template>
