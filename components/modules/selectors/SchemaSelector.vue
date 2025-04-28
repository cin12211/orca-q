<script setup lang="ts">
import { Select, SelectGroup, SelectItem, SelectTrigger } from '#components';
import { cn } from '@/lib/utils';
import { useAppContext } from '~/shared/contexts/useAppContext';

const props = defineProps<{ class: string }>();

const { schemaStore } = useAppContext();
const { schemasByCurrentConnection, currentSchema } = toRefs(schemaStore);
</script>
<template>
  <Select
    @update:model-value="
      e => {
        schemaStore.setSelectedSchemaId(e as string);
      }
    "
    :model-value="currentSchema?.name"
  >
    <SelectTrigger :class="cn(props.class, 'w-48 h-8 cursor-pointer')">
      <div class="flex items-center gap-2 w-44 truncate" v-if="currentSchema">
        {{ currentSchema?.name }}
      </div>
      <div class="opacity-50" v-else>Select connection</div>
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectItem
          :value="schema.name"
          v-for="schema in schemasByCurrentConnection"
        >
          {{ schema.name }}
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
