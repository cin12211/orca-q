<script setup lang="ts">
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseFileOptions } from '~/core/constants/database-file-options';
import type { FileDatabaseType } from '../types';
import DuckDbFileOptions from './DuckDbFileOptions.vue';
import SqliteFileOptions from './SqliteFileOptions.vue';

defineProps<{ databaseType: FileDatabaseType }>();

const options = defineModel<DatabaseFileOptions>({ required: true });
</script>

<template>
  <Accordion type="single" collapsible class="border-t">
    <AccordionItem value="advanced" class="border-b-0">
      <AccordionTrigger
        data-testid="create-database-file-advanced"
        class="py-3 text-sm"
      >
        Advanced
      </AccordionTrigger>
      <AccordionContent class="space-y-3">
        <DuckDbFileOptions
          v-if="databaseType === DatabaseClientType.DUCKDB"
          v-model="options"
        />
        <SqliteFileOptions v-else v-model="options" />
      </AccordionContent>
    </AccordionItem>
  </Accordion>
</template>
