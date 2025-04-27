<script setup lang="ts">
import ManagementConnection from '~/components/modules/management-connection/ManagementConnection.vue';

definePageMeta({
  layout: 'default',
});

const colorMode = useColorMode();
</script>

<template>
  <ManagementConnection />
</template>
