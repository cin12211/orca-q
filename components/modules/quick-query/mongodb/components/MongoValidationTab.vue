<script setup lang="ts">
import { computed, onMounted } from 'vue';
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import type { Connection } from '~/core/stores';
import { useMongoCollectionValidation } from '../hooks';

const props = defineProps<{
  connection: Connection | undefined;
  collectionName: string;
  databaseName?: string;
}>();

const { validation, isLoading, error, fetchValidation } =
  useMongoCollectionValidation({
    connection: computed(() => props.connection),
    collectionName: computed(() => props.collectionName),
    databaseName: computed(() => props.databaseName),
  });

const hasValidator = computed(() => !!validation.value?.validator);

onMounted(fetchValidation);
</script>

<template>
  <div class="relative min-h-16">
    <LoadingOverlay :visible="isLoading" />

    <div v-if="error" class="p-2">
      <Alert variant="destructive">
        <AlertDescription class="flex items-center justify-between gap-2">
          <span>{{ error }}</span>
          <Button variant="outline" size="xs" @click="fetchValidation">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    </div>

    <div v-else-if="hasValidator" class="p-2 space-y-2">
      <div class="flex items-center gap-2">
        <Badge variant="default" class="h-5 px-1.5 text-xxs">
          Level: {{ validation!.validationLevel }}
        </Badge>
        <Badge variant="secondary" class="h-5 px-1.5 text-xxs">
          Action: {{ validation!.validationAction }}
        </Badge>
      </div>
      <div class="text-xs bg-background overflow-x-auto">
        <VueJsonPretty
          :data="validation!.validator"
          :deep="3"
          :show-double-quotes="true"
          :show-length="false"
          :show-line="false"
          :show-icon="true"
        />
      </div>
    </div>

    <div v-else-if="!isLoading" class="flex items-center justify-center py-6">
      <BaseEmpty
        title="No Validation Rules"
        desc="This collection has no schema validation configured."
      />
    </div>
  </div>
</template>
