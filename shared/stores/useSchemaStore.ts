import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useManagementConnectionStore } from './managementConnectionStore';

interface Column {
  label: string;
  type: 'field';
  info: string;
}

export interface TableDetails {
  [tableName: string]: Column[];
}

export interface Schema {
  connectionId: string;
  workspaceId: string;
  name: string;
  tableDetails?: TableDetails | null;
  tables: string[];
  views: string[];
  functions: string[];
}

export const PUBLIC_SCHEMA_ID = 'public';

export const useSchemaStore = defineStore(
  'schema-store',
  () => {
    const schemas = ref<Schema[]>([]);

    const connectionStore = useManagementConnectionStore();

    const selectedSchemaId = ref<string>();

    const schemasByCurrentConnection = computed(() => {
      return schemas.value.filter(
        schema => schema.connectionId === connectionStore.selectedConnectionId
      );
    });

    const currentSchema = computed(() => {
      return schemas.value.find(
        schema =>
          schema.name === selectedSchemaId.value &&
          schema.connectionId === connectionStore.selectedConnectionId
      );
    });

    const setSelectedSchemaId = (schemaId: string) => {
      selectedSchemaId.value = schemaId;
    };

    const setInitialSchema = () => {
      console.log('schemas.value', schemas.value);
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

    const updateSchemasForWorkspace = ({
      connectionId,
      newSchemas,
    }: {
      connectionId: string;
      newSchemas: Schema[];
    }) => {
      // remove all schemas for this workspace
      let tmpSchema = schemas.value.filter(
        schema => schema.connectionId !== connectionId
      );

      tmpSchema = [...tmpSchema, ...newSchemas];

      schemas.value = tmpSchema;

      if (!newSchemas.length) {
        selectedSchemaId.value = undefined;
        return;
      }
    };

    return {
      schemas,
      selectedSchemaId,
      currentSchema,
      updateSchemasForWorkspace,
      setSelectedSchemaId,
      setInitialSchema,
      schemasByCurrentConnection,
    };
  },
  {
    persist: true,
  }
);
