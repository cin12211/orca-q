<script setup lang="ts">
import { Select, SelectGroup, SelectItem, SelectTrigger } from '#components';
import { cn } from '@/lib/utils';
import { useAppContext } from '~/shared/contexts/useAppContext';

const props = defineProps<{ class: string }>();

const { schemaStore, setSchemaId, schemaId } = useAppContext();
const { schemasByCurrentConnection, currentSchema } = toRefs(schemaStore);
</script>
<template>
  <Select
    @update:model-value="
      e => {
        console.log('e', e);

        setSchemaId(e as string);
      }
    "
    :model-value="schemaId"
  >
    <SelectTrigger :class="cn(props.class, 'w-48 cursor-pointer')" size="sm">
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
          class="cursor-pointer"
        >
          {{ schema.name }}
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
