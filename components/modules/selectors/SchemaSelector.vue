<script setup lang="ts">
import { Select, SelectGroup, SelectItem, SelectTrigger } from '#components';
import { cn } from '@/lib/utils';
import { useAppContext } from '~/core/contexts/useAppContext';

const props = defineProps<{ class: string }>();

const { schemaStore, wsStateStore, setSchemaId } = useAppContext();

const { activeSchema, schemasByContext } = toRefs(schemaStore);
const { schemaId } = toRefs(wsStateStore);
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
