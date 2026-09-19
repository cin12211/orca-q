<script setup lang="ts">
import { Badge } from '#components';
import type { RawQueryHeaderContext } from '~/components/modules/database/sqlfamily/raw-query/registry/rawQueryProfile.types';

defineProps<{
  context?: RawQueryHeaderContext;
}>();
</script>

<template>
  <Badge variant="secondary" class="text-xxs">MongoDB Beta</Badge>
</template>
