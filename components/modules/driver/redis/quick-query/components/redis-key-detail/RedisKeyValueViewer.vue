<script setup lang="ts">
import JsonEditorVue from 'json-editor-vue';
import type {
  RedisKeyDetail,
  RedisKeyTableRow,
} from '~/core/types/redis-workspace.types';

const props = defineProps<{
  detail: RedisKeyDetail;
  canEdit?: boolean;
  saving?: boolean;
  canSubmit?: boolean;
}>();

const emit = defineEmits<{
  (e: 'save'): void;
}>();

const textValue = defineModel<string>('textValue', { default: '' });
const jsonValue = defineModel<unknown>('jsonValue', { default: null });
const jsonMode = defineModel<'tree' | 'text'>('jsonMode', { default: 'tree' });
const tableRows = defineModel<RedisKeyTableRow[]>('tableRows', {
  default: () => [],
});

const formattedReadOnlyValue = computed(() => {
  if (typeof props.detail.value === 'string') {
    return props.detail.value;
  }

  return JSON.stringify(props.detail.value, null, 2);
});

const showAddRowAction = computed(
  () => !!props.canEdit && props.detail.previewKind === 'table'
);

const updateTableCell = (rowId: string, key: string, value: string) => {
  const row = tableRows.value.find(item => item.id === rowId);

  if (!row) {
    return;
  }

  const column = props.detail.tableColumns?.find(item => item.key === key);
  row[key] = column?.type === 'number' ? Number(value || 0) : value;
};

const reindexListRows = () => {
  if (props.detail.tableKind !== 'list') {
    return;
  }

  tableRows.value = tableRows.value.map((row, index) => ({
    ...row,
    index,
  }));
};

const addRow = () => {
  if (!props.detail.tableKind) {
    return;
  }

  const nextId = `row-${Date.now()}-${tableRows.value.length}`;

  switch (props.detail.tableKind) {
    case 'hash':
      tableRows.value.push({ id: nextId, field: '', value: '' });
      break;
    case 'list':
      tableRows.value.push({
        id: nextId,
        index: tableRows.value.length,
        value: '',
      });
      break;
    case 'set':
      tableRows.value.push({ id: nextId, value: '' });
      break;
    case 'zset':
      tableRows.value.push({ id: nextId, value: '', score: 0 });
      break;
  }
};

const removeRow = (rowId: string) => {
  tableRows.value = tableRows.value.filter(row => row.id !== rowId);
  reindexListRows();
};
</script>

<template>
  <div class="space-y-3">
    <div v-if="detail.previewKind === 'text'" class="space-y-3">
      <textarea
        v-model="textValue"
        :readonly="!canEdit"
        class="min-h-[320px] w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono"
      />
    </div>

    <div
      v-else-if="detail.previewKind === 'json'"
      class="min-h-[360px] overflow-hidden rounded-lg border"
    >
      <JsonEditorVue
        v-model="jsonValue"
        class="h-[360px]"
        :mode="jsonMode as unknown as undefined"
        :navigationBar="false"
        :readOnly="!canEdit"
        @modeChange="jsonMode = $event"
      />
    </div>

    <div v-else-if="detail.previewKind === 'table'" class="space-y-3">
      <div class="flex justify-end">
        <Button
          v-if="showAddRowAction"
          variant="outline"
          size="sm"
          @click="addRow"
        >
          Add Row
        </Button>
      </div>

      <div class="overflow-hidden rounded-lg border">
        <table class="w-full text-sm">
          <thead class="bg-muted/30 text-left">
            <tr>
              <th
                v-for="column in detail.tableColumns"
                :key="column.key"
                class="px-3 py-2 font-medium"
              >
                {{ column.label }}
              </th>
              <th class="w-16 px-3 py-2 font-medium"></th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="row in tableRows"
              :key="row.id"
              class="border-t align-top"
            >
              <td
                v-for="column in detail.tableColumns"
                :key="column.key"
                class="px-3 py-2"
              >
                <Input
                  v-if="column.editable"
                  size="xs"
                  :model-value="`${row[column.key] ?? ''}`"
                  :disabled="!canEdit"
                  @update:model-value="
                    updateTableCell(row.id, column.key, String($event || ''))
                  "
                />
                <span v-else>{{ row[column.key] }}</span>
              </td>
              <td class="px-3 py-2 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  :disabled="!canEdit"
                  @click="removeRow(row.id)"
                >
                  Remove
                </Button>
              </td>
            </tr>

            <tr v-if="tableRows.length === 0">
              <td
                :colspan="(detail.tableColumns?.length || 0) + 1"
                class="px-3 py-6 text-center text-sm text-muted-foreground"
              >
                No rows available.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <pre
      v-else
      class="min-h-[320px] overflow-auto rounded-lg border bg-muted/20 p-3 text-xs"
    ><code>{{ formattedReadOnlyValue }}</code></pre>

    <div class="flex justify-end">
      <Button size="sm" :disabled="saving || !canSubmit" @click="emit('save')">
        Save Changes
      </Button>
    </div>
  </div>
</template>
