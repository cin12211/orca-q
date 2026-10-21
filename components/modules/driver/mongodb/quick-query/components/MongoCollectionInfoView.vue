<script setup lang="ts">
import type { Connection } from '~/core/stores';
import MongoIndexesTab from './MongoIndexesTab.vue';
import MongoValidationTab from './MongoValidationTab.vue';

defineProps<{
  connection: Connection | undefined;
  collectionName: string;
  databaseName?: string;
}>();
</script>

<template>
  <div class="h-full overflow-y-auto p-1.5">
    <div class="space-y-3 pb-2">
      <section class="space-y-1">
        <div>
          <h3 class="text-sm font-medium">Indexes</h3>
          <p class="text-xs text-muted-foreground">
            Available indexes and their definitions
          </p>
        </div>
        <div class="rounded-md border">
          <MongoIndexesTab
            :connection="connection"
            :collection-name="collectionName"
            :database-name="databaseName"
          />
        </div>
      </section>

      <section class="space-y-1">
        <div>
          <h3 class="text-sm font-medium">Validation</h3>
          <p class="text-xs text-muted-foreground">
            Schema validation rules enforced on writes
          </p>
        </div>
        <div class="rounded-md border">
          <MongoValidationTab
            :connection="connection"
            :collection-name="collectionName"
            :database-name="databaseName"
          />
        </div>
      </section>
    </div>
  </div>
</template>
