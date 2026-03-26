<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { Select, SelectGroup, SelectItem, SelectTrigger } from '#components';
import { cn } from '@/lib/utils';
import { useAppContext } from '~/core/contexts/useAppContext';
import { useSchemaStore, useWSStateStore } from '~/core/stores';

const props = defineProps<{ class: string }>();

const { setSchemaId } = useAppContext();
const schemaStore = useSchemaStore();
const wsStateStore = useWSStateStore();

const { activeSchema, schemasByContext } = storeToRefs(schemaStore);
const { schemaId } = storeToRefs(wsStateStore);
</script>
<template>
  <Select
    @update:model-value="
      e => {
        setSchemaId(e as string);
      }
    "
    :model-value="schemaId"
  >
    <SelectTrigger :class="cn(props.class, 'w-48 cursor-pointer')" size="sm">
      <div class="flex items-center gap-2 w-44 truncate" v-if="activeSchema">
        {{ activeSchema?.name }}
      </div>
      <div class="opacity-50" v-else>Select connection</div>
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectItem
          :value="schema.name"
          v-for="schema in schemasByContext"
          class="cursor-pointer"
        >
          {{ schema.name }}
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
