import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ReservedTableSchemas } from '~/server/api/get-reverse-table-schemas';
import { useWSStateStore } from './useWSStateStore';

interface Column {
  label: string;
  type: 'field';
  info: string;
}

export interface TableDetails {
  [tableName: string]: Column[];
}

export interface Schema {
  id: string;
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
    const wsStateStore = useWSStateStore();
    const { wsState, connectionId, schemaId } = toRefs(wsStateStore);

    const schemas = ref<Schema[]>([]);
    const reservedSchemas = ref<ReservedTableSchemas[]>([]);

    const activeSchema = computed(() => {
      return schemas.value.find(
        schema =>
          schema.connectionId === connectionId.value &&
          schema.workspaceId === wsState.value?.id &&
          schema.name === schemaId.value
      );
    });

    const schemasByContext = computed(() => {
      return schemas.value.filter(
        schema =>
          schema.connectionId === connectionId.value &&
          schema.workspaceId === wsState.value?.id
      );
    });

    // const setInitialSchema = () => {
    //   if (!wsState.value?.id || !wsState.value?.connectionId) {
    //     return;
    //   }

    //   console.log('schemas.value', schemas.value);
    //   if (!schemas.value.length) {
    //     return;
    //   }

    //   const havePublicSchemas = schemas.value.some(
    //     schema => schema.name === PUBLIC_SCHEMA_ID
    //   );

    //   let schemaIdTmp = havePublicSchemas
    //     ? PUBLIC_SCHEMA_ID
    //     : schemas.value[0].name;

    //   wsStateStore.setSchemaId({
    //     schemaId: schemaIdTmp,
    //     workspaceId: wsState.value?.id,
    //     connectionId: wsState.value?.connectionId,
    //   });
    // };

    // const updateSchemasForWorkspace = ({
    //   connectionId,
    //   newSchemas,
    // }: {
    //   connectionId: string;
    //   newSchemas: Schema[];
    // }) => {
    //   // remove all schemas for this workspace
    //   let tmpSchema = schemas.value.filter(
    //     schema => schema.connectionId !== connectionId
    //   );

    //   tmpSchema = [...tmpSchema, ...newSchemas];

    //   schemas.value = tmpSchema;

    //   if (!newSchemas.length) {
    //     //TODO: need refactor
    //     // selectedSchemaId.value = undefined;
    //     return;
    //   }
    // };

    return {
      reservedSchemas,
      schemas,
      activeSchema,
      schemasByContext,
    };
  },
  {
    persist: true,
  }
);
