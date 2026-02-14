<script setup lang="ts">
import { useCopyToClipboard } from '~/composables/useCopyToClipboard';
import { useCodeHighlighter } from '~/composables/useSqlHighlighter';
import type {
  CreateRoleRequest,
  DatabaseInfo,
  SchemaInfo,
  SchemaObjects,
  SchemaGrant,
  ObjectGrant,
  PrivilegeType,
  ObjectType,
} from '~/shared/types';

interface Props {
  open: boolean;
  loading?: boolean;
  databasesLoading?: boolean;
  schemasLoading?: boolean;
  databases?: DatabaseInfo[];
  schemas?: SchemaInfo[];
  schemaObjects?: SchemaObjects | null;
  currentDatabase?: string | null;
  error?: string | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (
    e: 'confirm',
    data: {
      roleData: Omit<CreateRoleRequest, 'dbConnectionString'>;
      databaseGrants: { databaseName: string; privileges: PrivilegeType[] }[];
      schemaGrants: SchemaGrant[];
      objectGrants: ObjectGrant[];
    }
  ): void;
  (e: 'cancel'): void;
  (e: 'clearError'): void;
  (e: 'fetchSchemas'): void;
  (e: 'fetchSchemaObjects', schemaName: string): void;
}>();

// Current step (1-5)
const currentStep = ref(1);
const totalSteps = 5;

// Step 1: Basic Info
const formData = reactive({
  roleName: '',
  password: '',
  canLogin: true,
  canCreateDb: false,
  canCreateRole: false,
  isReplication: false,
  connectionLimit: -1,
  validUntil: '',
  comment: '',
});

// Step 2: Database Access
const selectedDatabase = ref<string>('');
const databaseConnect = ref(false);
const currentDatabaseName = computed(() => props.currentDatabase?.trim() || '');
const shouldSkipSchemaSteps = computed(() => {
  if (!selectedDatabase.value) return false;
  if (!currentDatabaseName.value) return false;
  return selectedDatabase.value !== currentDatabaseName.value;
});

// Step 3: Schema Permissions
const schemaPermissions = ref<Map<string, Set<'USAGE' | 'CREATE'>>>(new Map());

// Step 4: Object Permissions
const objectPermTab = ref<'tables' | 'functions' | 'sequences'>('tables');
const tablePermissions = reactive({
  scope: 'all' as 'all' | 'selected',
  privileges: new Set<PrivilegeType>(),
  applyToFuture: false,
});
const functionPermissions = reactive({
  scope: 'all' as 'all' | 'selected',
  privileges: new Set<PrivilegeType>(),
  applyToFuture: false,
});
const sequencePermissions = reactive({
  scope: 'all' as 'all' | 'selected',
  privileges: new Set<PrivilegeType>(),
  applyToFuture: false,
});

// Password visibility
const showPassword = ref(false);

// Step 1 validation
const step1Errors = computed(() => {
  const errors: string[] = [];
  if (!formData.roleName.trim()) {
    errors.push('Username is required');
  }
  if (formData.roleName.includes(' ')) {
    errors.push('Username cannot contain spaces');
  }
  return errors;
});

const isStep1Valid = computed(() => step1Errors.value.length === 0);

// Step 3 validation - need at least one schema with USAGE
const hasSchemaUsage = computed(() => {
  for (const [, perms] of schemaPermissions.value) {
    if (perms.has('USAGE')) return true;
  }
  return false;
});

// Get selected schemas for Step 4
const selectedSchemasWithUsage = computed(() => {
  const result: string[] = [];
  for (const [schema, perms] of schemaPermissions.value) {
    if (perms.has('USAGE')) result.push(schema);
  }
  return result;
});

// Generated SQL for preview
const generatedSQL = computed(() => {
  const opts: string[] = [];

  if (formData.canLogin) {
    opts.push('LOGIN');
    if (formData.password) {
      opts.push(`PASSWORD '${formData.password.replace(/'/g, "''")}'`);
    }
  } else {
    opts.push('NOLOGIN');
  }

  if (formData.canCreateDb) opts.push('CREATEDB');
  if (formData.canCreateRole) opts.push('CREATEROLE');
  if (formData.isReplication) opts.push('REPLICATION');
  if (formData.connectionLimit >= 0) {
    opts.push(`CONNECTION LIMIT ${formData.connectionLimit}`);
  }
  if (formData.validUntil) {
    opts.push(`VALID UNTIL '${formData.validUntil}'`);
  }

  let sql = `CREATE ROLE "${formData.roleName}" WITH ${opts.join(' ')};\n`;

  // Database grant
  if (selectedDatabase.value && databaseConnect.value) {
    sql += `GRANT CONNECT ON DATABASE "${selectedDatabase.value}" TO "${formData.roleName}";\n`;
  }

  // Schema grants
  for (const [schema, perms] of schemaPermissions.value) {
    if (perms.size > 0) {
      sql += `GRANT ${Array.from(perms).join(', ')} ON SCHEMA "${schema}" TO "${formData.roleName}";\n`;
    }
  }

  // Object grants (tables)
  for (const schema of selectedSchemasWithUsage.value) {
    if (tablePermissions.privileges.size > 0) {
      const privs = Array.from(tablePermissions.privileges).join(', ');
      sql += `GRANT ${privs} ON ALL TABLES IN SCHEMA "${schema}" TO "${formData.roleName}";\n`;
      if (tablePermissions.applyToFuture) {
        sql += `ALTER DEFAULT PRIVILEGES IN SCHEMA "${schema}" GRANT ${privs} ON TABLES TO "${formData.roleName}";\n`;
      }
    }
  }

  // Object grants (functions)
  for (const schema of selectedSchemasWithUsage.value) {
    if (functionPermissions.privileges.size > 0) {
      const privs = Array.from(functionPermissions.privileges).join(', ');
      sql += `GRANT ${privs} ON ALL FUNCTIONS IN SCHEMA "${schema}" TO "${formData.roleName}";\n`;
      if (functionPermissions.applyToFuture) {
        sql += `ALTER DEFAULT PRIVILEGES IN SCHEMA "${schema}" GRANT ${privs} ON FUNCTIONS TO "${formData.roleName}";\n`;
      }
    }
  }

  // Object grants (sequences)
  for (const schema of selectedSchemasWithUsage.value) {
    if (sequencePermissions.privileges.size > 0) {
      const privs = Array.from(sequencePermissions.privileges).join(', ');
      sql += `GRANT ${privs} ON ALL SEQUENCES IN SCHEMA "${schema}" TO "${formData.roleName}";\n`;
      if (sequencePermissions.applyToFuture) {
        sql += `ALTER DEFAULT PRIVILEGES IN SCHEMA "${schema}" GRANT ${privs} ON SEQUENCES TO "${formData.roleName}";\n`;
      }
    }
  }

  return sql;
});

// SQL Highlighting
const { highlightSql } = useCodeHighlighter();
const highlightedSql = computed(() => {
  if (!generatedSQL.value) return null;
  return highlightSql(generatedSQL.value);
});

// Clipboard copy with feedback
const { copied, handleCopy, getCopyIcon, getCopyIconClass, getCopyTooltip } =
  useCopyToClipboard();
const onCopySQL = () => handleCopy(generatedSQL.value);

// Step navigation
const nextStep = () => {
  if (currentStep.value < totalSteps) {
    // Fetch schemas when advancing from Database -> Schemas
    if (currentStep.value === 2 && selectedDatabase.value) {
      if (shouldSkipSchemaSteps.value) {
        currentStep.value = totalSteps;
        return;
      }
      emit('fetchSchemas');
    }
    currentStep.value++;
  }
};

const prevStep = () => {
  if (currentStep.value === totalSteps && shouldSkipSchemaSteps.value) {
    currentStep.value = 2;
    return;
  }
  if (currentStep.value > 1) currentStep.value--;
};

const canGoNext = computed(() => {
  if (currentStep.value === 1) return isStep1Valid.value;
  if (currentStep.value === 2) {
    return !!selectedDatabase.value && !props.databasesLoading;
  }
  if (currentStep.value === 3) return hasSchemaUsage.value;
  return true;
});

watch(selectedDatabase, () => {
  schemaPermissions.value.clear();
  tablePermissions.privileges.clear();
  tablePermissions.applyToFuture = false;
  functionPermissions.privileges.clear();
  functionPermissions.applyToFuture = false;
  sequencePermissions.privileges.clear();
  sequencePermissions.applyToFuture = false;
});

// Toggle schema permission
const toggleSchemaPermission = (schema: string, perm: 'USAGE' | 'CREATE') => {
  const current = schemaPermissions.value.get(schema) ?? new Set();
  const next = new Set(current);
  if (next.has(perm)) {
    next.delete(perm);
  } else {
    next.add(perm);
  }
  schemaPermissions.value.set(schema, next);
};

const hasSchemaPermission = (schema: string, perm: 'USAGE' | 'CREATE') => {
  return schemaPermissions.value.get(schema)?.has(perm) ?? false;
};

// Toggle object permission
const toggleTablePrivilege = (priv: PrivilegeType) => {
  if (tablePermissions.privileges.has(priv)) {
    tablePermissions.privileges.delete(priv);
  } else {
    tablePermissions.privileges.add(priv);
  }
};

const toggleFunctionPrivilege = (priv: PrivilegeType) => {
  if (functionPermissions.privileges.has(priv)) {
    functionPermissions.privileges.delete(priv);
  } else {
    functionPermissions.privileges.add(priv);
  }
};

const toggleSequencePrivilege = (priv: PrivilegeType) => {
  if (sequencePermissions.privileges.has(priv)) {
    sequencePermissions.privileges.delete(priv);
  } else {
    sequencePermissions.privileges.add(priv);
  }
};

// Submit
const onSubmit = () => {
  // Build schema grants
  const schemaGrants: SchemaGrant[] = [];
  for (const [schema, perms] of schemaPermissions.value) {
    if (perms.size > 0) {
      schemaGrants.push({
        schemaName: schema,
        privileges: Array.from(perms),
      });
    }
  }

  // Build object grants
  const objectGrants: ObjectGrant[] = [];

  for (const schema of selectedSchemasWithUsage.value) {
    if (tablePermissions.privileges.size > 0) {
      objectGrants.push({
        objectType: 'table' as ObjectType,
        schemaName: schema,
        privileges: Array.from(tablePermissions.privileges),
        applyToFuture: tablePermissions.applyToFuture,
      });
    }
    if (functionPermissions.privileges.size > 0) {
      objectGrants.push({
        objectType: 'function' as ObjectType,
        schemaName: schema,
        privileges: Array.from(functionPermissions.privileges),
        applyToFuture: functionPermissions.applyToFuture,
      });
    }
    if (sequencePermissions.privileges.size > 0) {
      objectGrants.push({
        objectType: 'sequence' as ObjectType,
        schemaName: schema,
        privileges: Array.from(sequencePermissions.privileges),
        applyToFuture: sequencePermissions.applyToFuture,
      });
    }
  }

  emit('confirm', {
    roleData: {
      roleName: formData.roleName,
      password: formData.password || undefined,
      canLogin: formData.canLogin,
      canCreateDb: formData.canCreateDb,
      canCreateRole: formData.canCreateRole,
      isReplication: formData.isReplication,
      connectionLimit:
        formData.connectionLimit >= 0 ? formData.connectionLimit : undefined,
      validUntil: formData.validUntil || undefined,
      comment: formData.comment || undefined,
    },
    databaseGrants:
      selectedDatabase.value && databaseConnect.value
        ? [
            {
              databaseName: selectedDatabase.value,
              privileges: ['CONNECT' as PrivilegeType],
            },
          ]
        : [],
    schemaGrants,
    objectGrants,
  });
};

// Reset form when dialog closes
const resetForm = () => {
  currentStep.value = 1;
  formData.roleName = '';
  formData.password = '';
  formData.canLogin = true;
  formData.canCreateDb = false;
  formData.canCreateRole = false;
  formData.isReplication = false;
  formData.connectionLimit = -1;
  formData.validUntil = '';
  formData.comment = '';
  selectedDatabase.value = '';
  databaseConnect.value = false;
  schemaPermissions.value.clear();
  tablePermissions.privileges.clear();
  tablePermissions.applyToFuture = false;
  functionPermissions.privileges.clear();
  functionPermissions.applyToFuture = false;
  sequencePermissions.privileges.clear();
  sequencePermissions.applyToFuture = false;
  showPassword.value = false;
};

watch(
  () => props.open,
  open => {
    if (!open) {
      resetForm();
    }
  }
);

// Clear error when step changes
watch(currentStep, () => {
  emit('clearError');
});

// Step titles
const stepTitles = ['User Info', 'Database', 'Schemas', 'Objects', 'Review'];
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="w-[65vw] h-[60vh] max-w-[65vw]! gap-1 p-5 flex flex-col flex-1 overflow-hidden"
    >
      <DialogHeader>
        <DialogTitle class="flex items-center font-medium! gap-2">
          <Icon name="lucide:user-plus" class="size-5 text-primary" />
          Create New User/Role
        </DialogTitle>
        <DialogDescription>
          <div class="flex items-center justify-between">
            <span class="text-sm"
              >Step {{ currentStep }}: {{ stepTitles[currentStep - 1] }}</span
            >
            <div class="flex items-center gap-1">
              <div
                v-for="step in totalSteps"
                :key="step"
                :class="[
                  'w-6 h-1 rounded-full transition-colors',
                  step <= currentStep ? 'bg-primary' : 'bg-muted',
                ]"
              />
            </div>
          </div>
        </DialogDescription>
      </DialogHeader>

      <div class="h-full mt-4">
        <!-- Step 1: Basic Information -->
        <div v-if="currentStep === 1" class="space-y-2">
          <div class="space-y-2">
            <Label for="roleName"
              >Username <span class="text-destructive">*</span></Label
            >
            <Input
              id="roleName"
              v-model="formData.roleName"
              placeholder="Enter username"
              :class="{
                'border-destructive':
                  formData.roleName &&
                  step1Errors.some(e => e.includes('Username')),
              }"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="password">Password</Label>
              <div class="relative">
                <Input
                  id="password"
                  v-model="formData.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Enter password"
                  class="pr-10"
                />
                <button
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  @click="showPassword = !showPassword"
                >
                  <Icon
                    :name="showPassword ? 'lucide:eye-off' : 'lucide:eye'"
                    class="size-4"
                  />
                </button>
              </div>
              <p class="text-xs text-amber-500 dark:text-amber-400">
                Leave blank to create a role without a password.
              </p>
            </div>

            <div class="space-y-2">
              <Label for="connectionLimit">Connection Limit</Label>
              <Input
                id="connectionLimit"
                v-model.number="formData.connectionLimit"
                type="number"
                :min="-1"
                placeholder="No limit"
              />
              <p class="text-xs text-muted-foreground">
                Use `-1` for no limit.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 pt-2">
            <div class="flex items-center space-x-2">
              <Checkbox id="canLogin" v-model:model-value="formData.canLogin" />
              <Label for="canLogin" class="text-sm font-normal cursor-pointer"
                >Can Login</Label
              >
            </div>
            <div class="flex items-center space-x-2">
              <Checkbox
                id="canCreateDb"
                v-model:model-value="formData.canCreateDb"
              />
              <Label
                for="canCreateDb"
                class="text-sm font-normal cursor-pointer"
                >Create DB</Label
              >
            </div>
            <div class="flex items-center space-x-2">
              <Checkbox
                id="canCreateRole"
                v-model:model-value="formData.canCreateRole"
              />
              <Label
                for="canCreateRole"
                class="text-sm font-normal cursor-pointer"
                >Create Role</Label
              >
            </div>
            <div class="flex items-center space-x-2">
              <Checkbox
                id="isReplication"
                v-model:model-value="formData.isReplication"
              />
              <Label
                for="isReplication"
                class="text-sm font-normal cursor-pointer"
                >Replication</Label
              >
            </div>
          </div>

          <div
            v-if="step1Errors.length > 0 && formData.roleName"
            class="text-sm text-destructive space-y-1"
          >
            <div
              v-for="error in step1Errors"
              :key="error"
              class="flex items-center gap-1"
            >
              <Icon name="lucide:x" class="size-3" />
              {{ error }}
            </div>
          </div>
        </div>

        <!-- Step 2: Database Access -->
        <div v-else-if="currentStep === 2" class="space-y-2">
          <div class="space-y-2">
            <Label>Select Database</Label>
            <Select v-model="selectedDatabase" :disabled="databasesLoading">
              <SelectTrigger>
                <SelectValue
                  :placeholder="
                    databasesLoading
                      ? 'Loading databases...'
                      : 'Choose a database'
                  "
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="db in databases"
                  :key="db.databaseName"
                  :value="db.databaseName"
                >
                  {{ db.databaseName }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div
            v-if="shouldSkipSchemaSteps"
            class="p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm"
          >
            <div class="flex items-center gap-2">
              <Icon name="lucide:info" class="size-4" />
              <span>
                You're connected to
                <span class="font-medium">{{ currentDatabaseName }}</span
                >. Schema and object permissions can only be configured for the
                connected database, so you'll go directly to Review for
                database-level grants.
              </span>
            </div>
          </div>

          <div
            v-if="selectedDatabase && !databasesLoading"
            class="space-y-2 pt-2"
          >
            <div class="flex items-center space-x-2">
              <Checkbox id="dbConnect" v-model:model-value="databaseConnect" />
              <Label for="dbConnect" class="text-sm font-normal cursor-pointer">
                Grant CONNECT permission
              </Label>
            </div>
            <p class="text-xs text-muted-foreground">
              CONNECT allows the user to connect to this database.
            </p>
          </div>

          <div
            v-if="databasesLoading"
            class="flex items-center justify-center gap-2 py-8 text-muted-foreground"
          >
            <Icon
              name="lucide:loader-2"
              class="size-5 animate-spin text-muted-foreground"
            />
            <p class="text-sm">Loading databases...</p>
          </div>
          <div
            v-else-if="!databases?.length"
            class="flex flex-col items-center justify-center py-8 text-muted-foreground"
          >
            <Icon name="lucide:database" class="size-12 mb-2 opacity-50" />
            <p class="text-sm">No databases available</p>
          </div>
        </div>

        <!-- Step 3: Schema Permissions -->
        <div v-else-if="currentStep === 3" class="space-y-2">
          <div class="flex items-center justify-between">
            <Label>Schema Permissions</Label>
            <span class="text-xs text-muted-foreground"
              >At least one USAGE required</span
            >
          </div>

          <div
            v-if="schemasLoading"
            class="flex items-center justify-center gap-2 py-8 text-muted-foreground"
          >
            <Icon
              name="lucide:loader-2"
              class="size-5 animate-spin text-muted-foreground"
            />
            <p class="text-sm">Loading schemas...</p>
          </div>

          <div
            v-else-if="schemas?.length"
            class="space-y-2 max-h-[50vh] overflow-y-auto"
          >
            <div
              v-for="schema in schemas"
              :key="schema.schemaName"
              class="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div class="flex items-center gap-2">
                <Icon
                  name="lucide:folder"
                  class="size-4 text-muted-foreground"
                />
                <span class="text-sm font-medium">{{ schema.schemaName }}</span>
              </div>
              <div class="flex items-center gap-4">
                <div class="flex items-center space-x-2">
                  <Checkbox
                    :id="`schema-${schema.schemaName}-usage`"
                    :model-value="
                      hasSchemaPermission(schema.schemaName, 'USAGE')
                    "
                    @update:model-value="
                      toggleSchemaPermission(schema.schemaName, 'USAGE')
                    "
                  />
                  <Label
                    :for="`schema-${schema.schemaName}-usage`"
                    class="text-xs cursor-pointer"
                    >USAGE</Label
                  >
                </div>
                <div class="flex items-center space-x-2">
                  <Checkbox
                    :id="`schema-${schema.schemaName}-create`"
                    :model-value="
                      hasSchemaPermission(schema.schemaName, 'CREATE')
                    "
                    @update:model-value="
                      toggleSchemaPermission(schema.schemaName, 'CREATE')
                    "
                  />
                  <Label
                    :for="`schema-${schema.schemaName}-create`"
                    class="text-xs cursor-pointer"
                    >CREATE</Label
                  >
                </div>
              </div>
            </div>
          </div>

          <div
            v-else
            class="flex flex-col items-center justify-center py-8 text-muted-foreground"
          >
            <Icon name="lucide:folder" class="size-12 mb-2 opacity-50" />
            <p class="text-sm">No schemas found</p>
          </div>

          <div
            v-if="!hasSchemaUsage && schemas?.length"
            class="p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm"
          >
            <div class="flex items-center gap-2">
              <Icon name="lucide:alert-triangle" class="size-4" />
              <span
                >Select at least one schema with USAGE permission to
                continue</span
              >
            </div>
          </div>
        </div>

        <!-- Step 4: Object Permissions -->
        <div v-else-if="currentStep === 4" class="space-y-2">
          <Tabs v-model="objectPermTab" class="w-full">
            <TabsList class="w-full grid grid-cols-3">
              <TabsTrigger value="tables">
                <Icon name="lucide:table" class="size-4 mr-1" />
                Tables
              </TabsTrigger>
              <TabsTrigger value="functions">
                <Icon name="lucide:function-square" class="size-4 mr-1" />
                Functions
              </TabsTrigger>
              <TabsTrigger value="sequences">
                <Icon name="lucide:list-ordered" class="size-4 mr-1" />
                Sequences
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tables" class="space-y-2 pt-4">
              <div class="space-y-2">
                <Label class="text-sm">Table Privileges</Label>
                <div class="grid grid-cols-4 gap-2">
                  <div
                    v-for="priv in [
                      'SELECT',
                      'INSERT',
                      'UPDATE',
                      'DELETE',
                    ] as PrivilegeType[]"
                    :key="priv"
                    class="flex items-center space-x-2"
                  >
                    <Checkbox
                      :id="`table-${priv}`"
                      :model-value="tablePermissions.privileges.has(priv)"
                      @update:model-value="toggleTablePrivilege(priv)"
                    />
                    <Label
                      :for="`table-${priv}`"
                      class="text-xs cursor-pointer"
                      >{{ priv }}</Label
                    >
                  </div>
                </div>
              </div>
              <div class="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="tablesFuture"
                  v-model:model-value="tablePermissions.applyToFuture"
                />
                <Label
                  for="tablesFuture"
                  class="text-sm font-normal cursor-pointer"
                >
                  Apply to future tables (ALTER DEFAULT PRIVILEGES)
                </Label>
              </div>
            </TabsContent>

            <TabsContent value="functions" class="space-y-2 pt-4">
              <div class="space-y-2">
                <Label class="text-sm">Function Privileges</Label>
                <div class="flex items-center space-x-2">
                  <Checkbox
                    id="func-execute"
                    :model-value="functionPermissions.privileges.has('EXECUTE')"
                    @update:model-value="toggleFunctionPrivilege('EXECUTE')"
                  />
                  <Label for="func-execute" class="text-xs cursor-pointer"
                    >EXECUTE</Label
                  >
                </div>
              </div>
              <div class="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="funcFuture"
                  v-model:model-value="functionPermissions.applyToFuture"
                />
                <Label
                  for="funcFuture"
                  class="text-sm font-normal cursor-pointer"
                >
                  Apply to future functions
                </Label>
              </div>
            </TabsContent>

            <TabsContent value="sequences" class="space-y-2 pt-4">
              <div class="space-y-2">
                <Label class="text-sm">Sequence Privileges</Label>
                <div class="grid grid-cols-3 gap-2">
                  <div
                    v-for="priv in ['USAGE', 'SELECT'] as PrivilegeType[]"
                    :key="priv"
                    class="flex items-center space-x-2"
                  >
                    <Checkbox
                      :id="`seq-${priv}`"
                      :model-value="sequencePermissions.privileges.has(priv)"
                      @update:model-value="toggleSequencePrivilege(priv)"
                    />
                    <Label
                      :for="`seq-${priv}`"
                      class="text-xs cursor-pointer"
                      >{{ priv }}</Label
                    >
                  </div>
                </div>
              </div>
              <div class="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="seqFuture"
                  v-model:model-value="sequencePermissions.applyToFuture"
                />
                <Label
                  for="seqFuture"
                  class="text-sm font-normal cursor-pointer"
                >
                  Apply to future sequences
                </Label>
              </div>
            </TabsContent>
          </Tabs>

          <p class="text-xs text-muted-foreground">
            Permissions will be applied to all objects in selected schemas:
            {{ selectedSchemasWithUsage.join(', ') || 'none' }}
          </p>
        </div>

        <!-- Step 5: Review & Confirm -->
        <div v-else-if="currentStep === 5" class="space-y-2">
          <div class="space-y-2">
            <h4 class="text-sm font-medium">Summary</h4>
            <div class="grid grid-cols-2 gap-1 text-sm">
              <div class="text-muted-foreground">Username:</div>
              <div class="font-normal">{{ formData.roleName }}</div>

              <div class="text-muted-foreground">Type:</div>
              <div class="font-normal">
                {{ formData.canLogin ? 'User (login)' : 'Role' }}
              </div>

              <div class="text-muted-foreground">Database:</div>
              <div class="font-normal">{{ selectedDatabase || 'None' }}</div>

              <div class="text-muted-foreground">Schemas:</div>
              <div class="font-normal">
                <span v-if="shouldSkipSchemaSteps">Skipped</span>
                <span v-else
                  >{{ selectedSchemasWithUsage.length }} selected</span
                >
              </div>
            </div>
          </div>

          <div
            v-if="error"
            class="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm"
          >
            <div class="flex items-start gap-2">
              <Icon name="lucide:alert-circle" class="size-4 mt-0.5 shrink-0" />
              <div class="flex-1">
                <p class="font-medium">Error creating user</p>
                <p class="text-xs mt-1 opacity-90">{{ error }}</p>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium">Generated SQL</h4>
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-7 text-xs"
                    @click="onCopySQL"
                  >
                    <Icon
                      :name="getCopyIcon(copied)"
                      class="size-3 mr-1"
                      :class="getCopyIconClass(copied)"
                    />
                    {{ getCopyTooltip(copied, 'Copy') }}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{{
                  getCopyTooltip(copied, 'Copy SQL')
                }}</TooltipContent>
              </Tooltip>
            </div>
            <div
              class="max-h-[140px] w-full overflow-y-auto rounded-md border bg-muted/50"
            >
              <div
                v-if="highlightedSql"
                class="text-xs rounded-md overflow-x-auto [&>pre]:p-3 [&>pre]:rounded-md [&>pre]:whitespace-pre-wrap"
                v-html="highlightedSql"
              />
              <pre
                v-else
                class="text-xs font-mono whitespace-pre-wrap break-all p-3"
                >{{ generatedSQL }}</pre
              >
            </div>
          </div>
        </div>
      </div>

      <DialogFooter class="gap-2 sm:gap-0">
        <Button
          v-if="currentStep > 1"
          variant="outline"
          @click="prevStep"
          :disabled="loading"
        >
          <Icon name="lucide:arrow-left" class="size-4" />
          Back
        </Button>
        <div class="flex-1" />

        <div class="flex gap-2 items-center">
          <Button
            v-if="currentStep === 1"
            variant="outline"
            @click="emit('cancel')"
            :disabled="loading"
          >
            Cancel
          </Button>
          <Button
            v-if="currentStep < totalSteps"
            @click="nextStep"
            :disabled="!canGoNext"
          >
            {{ currentStep === 4 ? 'Review' : 'Next' }}
            <Icon name="lucide:arrow-right" class="size-4" />
          </Button>
          <Button
            v-if="currentStep === totalSteps"
            @click="onSubmit"
            :disabled="loading || !isStep1Valid"
          >
            <Icon
              v-if="loading"
              name="lucide:loader-2"
              class="size-4 mr-2 animate-spin"
            />
            Create User
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
