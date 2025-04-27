import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Schema } from './appState/interface';
import { useWorkspacesStore } from './useWorkspacesStore';

export const PUBLIC_SCHEMA_ID = 'public';

export const useSchemaStore = defineStore(
  'schema-store',
  () => {
    const schemas = ref<Schema[]>([]);

    const selectedSchemaId = ref<string>();

    const currentSchema = computed(() => {
      return schemas.value.find(
        schema => schema.name === selectedSchemaId.value
      );
    });

    const setSelectedSchemaId = (schemaId: string) => {
      selectedSchemaId.value = schemaId;
    };

    const setInitialSchema = () => {
      if (!schemas.value.length) {
        return;
      }

      const havePublicSchemas = schemas.value.some(
        schema => schema.name === PUBLIC_SCHEMA_ID
      );

      if (havePublicSchemas) {
        selectedSchemaId.value = PUBLIC_SCHEMA_ID;
      } else {
        selectedSchemaId.value = schemas.value[0].name;
      }
    };

    const updateSchemas = (newSchemas: Schema[]) => {
      schemas.value = newSchemas;

      if (!newSchemas.length) {
        selectedSchemaId.value = undefined;
        return;
      }

      setInitialSchema();
    };

    return {
      schemas,
      selectedSchemaId,
      currentSchema,
      updateSchemas,
      setSelectedSchemaId,
      setInitialSchema,
    };
  },
  {
    persist: true,
  }
);
