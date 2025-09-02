<script lang="ts" setup>
import WrapperErdDiagram from '~/components/modules/erd-diagram/WrapperErdDiagram.vue';

definePageMeta({
  keepalive: true,
  notAllowBottomPanel: true,
});
</script>

<template>
  <WrapperErdDiagram :table-id="undefined" />
</template>
