<script setup lang="ts">
import {
  SQLITE_FILE_OPTION_FIELDS,
  type DatabaseFileOptions,
} from '~/core/constants/database-file-options';
import DatabaseFileOptionField from './DatabaseFileOptionField.vue';

const options = defineModel<DatabaseFileOptions>({ required: true });
</script>

<template>
  <DatabaseFileOptionField
    v-for="field in SQLITE_FILE_OPTION_FIELDS"
    :key="field.key"
    v-model="options[field.key]"
    :field="field"
  />
</template>
