<script setup lang="ts">
import type { ImportOptions } from '~/core/types';

const model = defineModel<ImportOptions>({ required: true });

const setOption = (key: keyof ImportOptions, val: boolean) => {
  (model.value as Record<keyof ImportOptions, boolean | undefined>)[key] = val;
};

const fields: {
  key: keyof ImportOptions;
  label: string;
  id: string;
}[] = [
  { key: 'clean', label: 'Drop Objects First', id: 'import-clean' },
  { key: 'dataOnly', label: 'Data Only', id: 'import-data-only' },
  { key: 'schemaOnly', label: 'Schema Only', id: 'import-schema-only' },
  { key: 'exitOnError', label: 'Exit on Error', id: 'import-exit-on-error' },
];
</script>

<template>
  <div class="space-y-3">
    <Label class="text-sm font-medium">Options</Label>
    <div class="grid grid-cols-2 gap-4">
      <div
        v-for="field in fields"
        :key="field.key"
        class="flex items-center space-x-2"
      >
        <Switch
          :id="field.id"
          :model-value="model[field.key] as boolean"
          @update:model-value="setOption(field.key, $event)"
        />
        <Label :for="field.id" class="text-sm">{{ field.label }}</Label>
      </div>
    </div>
  </div>
</template>
