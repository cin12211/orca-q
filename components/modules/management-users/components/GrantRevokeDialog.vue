<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Label } from '#components';
import type {
  ObjectPermission,
  ObjectType,
  PrivilegeType,
} from '~/shared/types';

const tablePrivileges: PrivilegeType[] = [
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'TRUNCATE',
  'REFERENCES',
  'TRIGGER',
];
const schemaPrivileges: PrivilegeType[] = ['USAGE', 'CREATE'];
const functionPrivileges: PrivilegeType[] = ['EXECUTE'];
const sequencePrivileges: PrivilegeType[] = ['USAGE', 'SELECT', 'UPDATE'];

interface Props {
  open: boolean;
  mode: 'grant' | 'update';
  roleName: string;
  permission?: ObjectPermission;
  loading?: boolean;
}

interface Emits {
  (e: 'update:open', value: boolean): void;
  (
    e: 'confirm',
    data: {
      objectType: ObjectType;
      schemaName: string;
      objectName: string;
      grant: PrivilegeType[];
      revoke: PrivilegeType[];
    }
  ): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

/* =======================
 * State
 ======================= */
const objectType = ref<ObjectType>('table');
const schemaName = ref('public');
const objectName = ref('');
const selectedPrivileges = ref<PrivilegeType[]>([]);
const initialPrivileges = ref<PrivilegeType[]>([]);

/* =======================
 * Composables
 ======================= */
const { highlightSql } = useCodeHighlighter();
const { copied, handleCopy, getCopyIcon, getCopyIconClass, getCopyTooltip } =
  useCopyToClipboard();

/* =======================
 * Available privileges
 * (NO ALL)
 ======================= */
const availablePrivileges = computed<PrivilegeType[]>(() => {
  switch (objectType.value) {
    case 'table':
      return tablePrivileges;
    case 'schema':
      return schemaPrivileges;
    case 'function':
      return functionPrivileges;
    case 'sequence':
      return sequencePrivileges;
    default:
      return [];
  }
});

/* =======================
 * Sync form on open
 ======================= */
watch(
  () => props.open,
  isOpen => {
    if (!isOpen) return;

    if (props.permission) {
      objectType.value = props.permission.objectType;
      schemaName.value = props.permission.schemaName;
      objectName.value = props.permission.objectName;

      initialPrivileges.value = [...props.permission.privileges];
      selectedPrivileges.value = [...props.permission.privileges];
    } else {
      objectType.value = 'table';
      schemaName.value = 'public';
      objectName.value = '';
      initialPrivileges.value = [];
      selectedPrivileges.value = [];
    }
  }
);

/* =======================
 * Diff logic
 ======================= */
const privilegesToGrant = computed(() => selectedPrivileges.value);

const privilegesToRevoke = computed(() => {
  return tablePrivileges.filter(p => !selectedPrivileges.value.includes(p));
});

const hasChanges = computed(
  () =>
    privilegesToGrant.value.length > 0 || privilegesToRevoke.value.length > 0
);

const rawSql = computed(() => {
  const sName = schemaName.value || '<schema>';
  const oName = objectName.value || '<object>';
  const rName = props.roleName || '<role>';
  const obj = `${objectType.value.toUpperCase()} "${sName}"."${oName}"`;

  const sql: string[] = [];

  if (privilegesToGrant.value.length) {
    sql.push(
      `GRANT ${privilegesToGrant.value.join(', ')} ON ${obj} TO "${rName}";`
    );
  }

  if (privilegesToRevoke.value.length) {
    sql.push(
      `REVOKE ${privilegesToRevoke.value.join(', ')} ON ${obj} FROM "${rName}";`
    );
  }

  return sql.length ? sql.join('\n\n') : '-- No permission changes';
});

const highlightedSql = computed(() => highlightSql(rawSql.value));

/* =======================
 * Actions
 ======================= */
const togglePrivilege = (privilege: PrivilegeType) => {
  const idx = selectedPrivileges.value.indexOf(privilege);
  if (idx > -1) {
    selectedPrivileges.value.splice(idx, 1);
  } else {
    selectedPrivileges.value.push(privilege);
  }
};

const onCopy = () => handleCopy(rawSql.value);

const onConfirm = () => {
  if (!hasChanges.value) return;

  emit('confirm', {
    objectType: objectType.value,
    schemaName: schemaName.value,
    objectName: objectName.value,
    grant: privilegesToGrant.value,
    revoke: privilegesToRevoke.value,
  });
};

const onCancel = () => emit('update:open', false);

const dialogTitle = computed(() =>
  props.mode === 'grant'
    ? `Grant Permission to ${props.roleName}`
    : `Update Permission for ${props.roleName}`
);
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-[45vw]! w-[45vw]!">
      <DialogHeader>
        <DialogTitle>{{ dialogTitle }}</DialogTitle>
        <DialogDescription>
          Tick to grant, untick to revoke privileges.
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-2">
        <!-- Object Type -->
        <div class="grid gap-2">
          <Label>Object Type</Label>
          <Select v-model="objectType" :disabled="mode === 'update'">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="table">Table</SelectItem>
              <SelectItem value="schema">Schema</SelectItem>
              <SelectItem value="function">Function</SelectItem>
              <SelectItem value="sequence">Sequence</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Schema -->
        <div class="grid gap-2">
          <Label>Schema</Label>
          <Input v-model="schemaName" :disabled="mode === 'update'" />
        </div>

        <!-- Object -->
        <div class="grid gap-2">
          <Label>Object Name</Label>
          <Input v-model="objectName" :disabled="mode === 'update'" />
        </div>

        <!-- Privileges -->
        <div class="grid gap-2">
          <Label>Privileges</Label>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div
              v-for="priv in availablePrivileges"
              :key="priv"
              class="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                :model-value="selectedPrivileges.includes(priv)"
                @update:model-value="togglePrivilege(priv)"
              />
              <span class="text-xs">{{ priv }}</span>
            </div>
          </div>
        </div>

        <!-- SQL Preview -->
        <div class="grid gap-2">
          <Label>SQL Preview</Label>
          <div class="relative">
            <div class="absolute top-2 right-2">
              <Button variant="ghost" size="iconSm" @click="onCopy">
                <Icon
                  :name="getCopyIcon(copied)"
                  class="size-4"
                  :class="getCopyIconClass(copied)"
                />
              </Button>
            </div>

            <div class="max-h-96 overflow-y-auto rounded-md border bg-muted/50">
              <div
                v-if="highlightedSql"
                class="text-xs [&>pre]:p-3 [&>pre]:whitespace-pre-wrap"
                v-html="highlightedSql"
              />
              <pre v-else class="text-xs p-3 whitespace-pre-wrap"
                >{{ rawSql }}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="onCancel"> Cancel </Button>
        <Button :disabled="!hasChanges || loading" @click="onConfirm">
          <Icon
            v-if="loading"
            name="lucide:loader-2"
            class="size-4 mr-2 animate-spin"
          />
          {{ mode === 'grant' ? 'Grant' : 'Update' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
