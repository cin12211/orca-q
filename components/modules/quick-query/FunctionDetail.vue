<script setup lang="ts">
import { storeToRefs } from 'pinia';
import {
  acceptCompletion,
  startCompletion,
  type Completion,
} from '@codemirror/autocomplete';
import {
  SQLDialect,
  sql,
  type SQLNamespace,
  PostgreSQL,
} from '@codemirror/lang-sql';
import { Compartment } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { format } from 'sql-formatter';
import { toast } from 'vue-sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getConnectionParams } from '@/core/helpers/connection-helper';
import BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import {
  shortCutSaveFunction,
  shortCutFormatOnSave,
  sqlAutoCompletion,
  currentStatementLineGutterExtension,
} from '~/components/base/code-editor/extensions';
import { pgKeywordCompletion } from '~/components/base/code-editor/utils/pgKeywordCompletion';
import {
  generateRoutineUpdateSQL,
  getRoutineDefinitionType,
} from '~/components/modules/management/schemas/utils';
import QuickQueryErrorPopup from '~/components/modules/quick-query/QuickQueryErrorPopup.vue';
import FunctionControlBar from '~/components/modules/quick-query/function-control-bar/FunctionControlBar.vue';
import { useQuickQueryLogs, useSchemaStore } from '~/core/stores';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';

const props = defineProps<{
  functionId: string;
  connectionId?: string;
}>();

const connectionStore = useManagementConnectionStore();
const schemaStore = useSchemaStore();
const { activeSchema } = storeToRefs(schemaStore);

const code = ref('');
const originalCode = ref('');
const isSaving = ref(false);
const errorMessage = ref('');
const errorTitle = ref('Query error!');
const openErrorModal = ref(false);
const openPreviewModal = ref(false);
const previewSql = ref('');

const normalizedCode = computed(() => generateRoutineUpdateSQL(code.value));
const normalizedOriginalCode = computed(() =>
  generateRoutineUpdateSQL(originalCode.value)
);

const hasChanges = computed(
  () => normalizedCode.value !== normalizedOriginalCode.value
);

const previewTitle = computed(() => {
  const routineType = getRoutineDefinitionType(previewSql.value);
  return routineType
    ? `${routineType} update preview`
    : 'Routine update preview';
});

const mappedSchema = computed(() => {
  const tableDetails = activeSchema.value?.tableDetails;

  const schema: SQLNamespace = {};

  for (const key in tableDetails) {
    const columns = tableDetails[key]?.columns;

    schema[key] = columns.map(col => {
      const sqlNamespace: Completion = {
        label: col.name,
        type: 'field',
        info: col.short_type_name || '',
        boost: -col.ordinal_position,
      };

      return sqlNamespace;
    });
  }

  return schema;
});

const sqlCompartment = new Compartment();

const connection = computed(() => {
  if (props.connectionId) {
    return connectionStore.connections.find(c => c.id === props.connectionId);
  }
  return connectionStore.selectedConnection;
});

const requestBody = computed(() => ({
  functionId: props.functionId,
  ...getConnectionParams(connection.value),
}));

const { status } = useFetch('/api/functions/definition', {
  method: 'POST',
  body: requestBody,
  onResponse: response => {
    if (typeof response.response._data === 'string') {
      const fetchedCode = response.response._data || '';
      code.value = fetchedCode;
      originalCode.value = fetchedCode;
    }
  },
  watch: [requestBody],
});

const openMessageModal = (title: string, message: string) => {
  errorTitle.value = title;
  errorMessage.value = message;
  openErrorModal.value = true;
};

const getValidatedUpdateSql = () => {
  if (!hasChanges.value) {
    openMessageModal(
      'No changes to save',
      'The routine definition already matches the loaded version.'
    );
    return;
  }

  const nextPreviewSql = generateRoutineUpdateSQL(code.value);
  const routineType = getRoutineDefinitionType(nextPreviewSql);

  if (!routineType) {
    openMessageModal(
      'Invalid routine definition',
      'Preview requires a valid CREATE OR REPLACE FUNCTION or PROCEDURE statement.'
    );
    return;
  }

  return nextPreviewSql;
};

const openSavePreview = () => {
  if (isSaving.value) {
    return;
  }

  const nextPreviewSql = getValidatedUpdateSql();
  if (!nextPreviewSql) {
    return;
  }

  previewSql.value = nextPreviewSql;
  openPreviewModal.value = true;
};

const saveFunction = async (sqlToSave = previewSql.value) => {
  if (!sqlToSave || isSaving.value) return;

  isSaving.value = true;

  try {
    const response = await $fetch<{ queryTime?: number }>(
      '/api/functions/update',
      {
        method: 'POST',
        body: {
          ...getConnectionParams(connection.value),
          functionDefinition: sqlToSave,
        },
      }
    );

    originalCode.value = code.value;
    openPreviewModal.value = false;
    toast.success('Routine saved', {
      description: `Updated successfully in ${response?.queryTime ?? 0}ms`,
    });
  } catch (error: any) {
    openPreviewModal.value = false;
    openMessageModal(
      'Save failed',
      error?.data?.message || error?.message || 'Failed to save routine.'
    );
  } finally {
    isSaving.value = false;
  }
};

const saveCurrentFunction = async () => {
  if (isSaving.value) {
    return;
  }

  const nextPreviewSql = getValidatedUpdateSql();
  if (!nextPreviewSql) {
    return;
  }

  previewSql.value = nextPreviewSql;
  await saveFunction(nextPreviewSql);
};

const discardChanges = () => {
  code.value = originalCode.value;
};

const extensions = [
  shortCutSaveFunction(content => {
    code.value = content;
    openSavePreview();
  }),
  shortCutFormatOnSave((fileContent: string) => {
    const formatted = format(fileContent, {
      language: 'postgresql',
      keywordCase: 'upper',
    });
    return formatted;
  }),

  keymap.of([
    { key: 'Mod-i', run: startCompletion },
    { key: 'Tab', run: acceptCompletion },
  ]),

  sqlCompartment.of(
    sql({
      dialect: SQLDialect.define({
        ...PostgreSQL.spec,
        doubleDollarQuotedStrings: false,
      }),
      upperCaseKeywords: true,
      keywordCompletion: pgKeywordCompletion,
      schema: mappedSchema.value,
    })
  ),
  ...sqlAutoCompletion(),
  currentStatementLineGutterExtension,
];
</script>

<template>
  <QuickQueryErrorPopup
    v-model:open="openErrorModal"
    :title="errorTitle"
    :message="errorMessage"
  />

  <AlertDialog
    :open="openPreviewModal"
    @update:open="openPreviewModal = $event"
  >
    <AlertDialogContent class="border w-[55vw]! max-w-[55vw]!">
      <AlertDialogHeader>
        <AlertDialogTitle class="flex items-center text-base font-medium">
          <Icon name="lucide:file-search" class="size-4 mr-2" />
          {{ previewTitle }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          Review the exact SQL that will be submitted. The routine is not
          updated until you confirm this save.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <CodeHighlightPreview
        :code="previewSql"
        show-copy-button
        max-height="24rem"
      />

      <AlertDialogFooter>
        <AlertDialogCancel :disabled="isSaving">Cancel</AlertDialogCancel>
        <AlertDialogAction class="gap-2" @click.prevent="saveFunction">
          <Icon
            v-if="isSaving"
            name="hugeicons:loading-03"
            class="size-4 animate-spin"
          />
          <Icon v-else name="lucide:save" class="size-4" />
          Save to database
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <div class="flex flex-col h-full p-1">
    <div class="flex flex-col h-full border rounded-md">
      <FunctionControlBar
        :has-changes="hasChanges"
        :is-saving="isSaving"
        @on-preview="openSavePreview"
        @on-save="saveCurrentFunction"
        @on-discard="discardChanges"
      />
      <div class="h-full flex flex-col overflow-y-auto relative">
        <LoadingOverlay :visible="status === 'pending' || isSaving" />
        <BaseCodeEditor
          v-model="code"
          :extensions="extensions"
          :disabled="false"
        />
      </div>
    </div>
  </div>
</template>
