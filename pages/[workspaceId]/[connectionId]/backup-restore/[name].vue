<script setup lang="ts">
import {
  BackupRestoreContainer,
  type BackupRestoreTab,
} from '~/components/modules/database-tools';

definePageMeta({
  keepalive: true,
});

const route = useRoute('workspaceId-connectionId-backup-restore-name');

const connectionId = computed(() => route.params.connectionId as string);
const initialTab = computed(() => route.params.name as BackupRestoreTab);
</script>

<template>
  <BackupRestoreContainer
    :connection-id="connectionId"
    :initial-tab="initialTab"
  />
</template>
