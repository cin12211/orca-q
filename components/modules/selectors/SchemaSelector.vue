<script setup lang="ts">
import { storeToRefs } from 'pinia';
import {
  Select,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
} from '#components';
import { cn } from '@/lib/utils';
import { useAppContext } from '~/core/contexts/useAppContext';
import { useSchemaStore, useWSStateStore } from '~/core/stores';

const props = defineProps<{ class: string }>();

const { setSchemaId } = useAppContext();
const schemaStore = useSchemaStore();
const wsStateStore = useWSStateStore();

const { activeSchema, schemasByContext } = storeToRefs(schemaStore);
const { schemaId } = storeToRefs(wsStateStore);

// User schemas first, built-in system schemas (e.g. pg_catalog) in their own
// group so they stay selectable without cluttering the main list.
const userSchemas = computed(() =>
  schemasByContext.value.filter(schema => !schema.isSystem)
);
const systemSchemas = computed(() =>
  schemasByContext.value.filter(schema => schema.isSystem)
);
</script>
<template>
  <Select
    @update:model-value="
      e => {
        setSchemaId(e as string);
      }
    "
    :model-value="schemaId"
    size="sm"
  >
    <SelectTrigger :class="cn(props.class, 'w-48 cursor-pointer')">
      <div class="flex items-center gap-2 w-44 truncate" v-if="activeSchema">
        {{ activeSchema?.name }}
      </div>
      <div class="opacity-50" v-else>Select connection</div>
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectItem
          :value="schema.name"
          v-for="schema in userSchemas"
          :key="schema.id"
          class="cursor-pointer"
        >
          {{ schema.name }}
        </SelectItem>
      </SelectGroup>
      <template v-if="systemSchemas.length">
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel class="text-xxs! tracking-wider text-muted-foreground"
            >System</SelectLabel
          >
          <SelectItem
            :value="schema.name"
            v-for="schema in systemSchemas"
            :key="schema.id"
            class="cursor-pointer"
          >
            {{ schema.name }}
          </SelectItem>
        </SelectGroup>
      </template>
    </SelectContent>
  </Select>
</template>
