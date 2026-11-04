<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  RabbitPolicy,
  RabbitPolicyKind,
} from '~/core/types/rabbitmq.types';
import {
  RABBIT_POLICY_APPLY_TO,
  RABBIT_POLICY_KEY_HINTS,
} from '../../constants';

const JSON_INDENT = 2;
const DEFINITION_ERROR =
  'Definition must be a JSON object, for example {"max-length": 1000}.';

const props = defineProps<{
  vhosts: string[];
  /** Null to add a policy. */
  policy: RabbitPolicy | null;
  /** Kinds this user may write. */
  allowedKinds: RabbitPolicyKind[];
  /** Kind preselected when adding. */
  initialKind: RabbitPolicyKind;
  isSaving: boolean;
}>();

const emit = defineEmits<{
  (e: 'save', value: { policy: RabbitPolicy; previousName?: string }): void;
}>();

const open = defineModel<boolean>('open', { required: true });

const kind = ref<RabbitPolicyKind>('user');
const vhost = ref('');
const name = ref('');
const pattern = ref('.*');
const applyTo = ref('all');
const priority = ref('0');
const definitionText = ref('{}');

const parsedDefinition = computed<Record<string, unknown> | null>(() => {
  try {
    const value: unknown = JSON.parse(definitionText.value);
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
});
const parsedPriority = computed(() => Number.parseInt(priority.value, 10));
const canSubmit = computed(
  () =>
    Boolean(vhost.value && name.value.trim()) &&
    parsedDefinition.value !== null &&
    Number.isInteger(parsedPriority.value) &&
    !props.isSaving
);

const resetForm = () => {
  kind.value = props.policy?.kind ?? props.initialKind;
  vhost.value = props.policy?.vhost ?? props.vhosts[0] ?? '';
  name.value = props.policy?.name ?? '';
  pattern.value = props.policy?.pattern ?? '.*';
  applyTo.value = props.policy?.applyTo ?? 'all';
  priority.value = String(props.policy?.priority ?? 0);
  definitionText.value = JSON.stringify(
    props.policy?.definition ?? {},
    null,
    JSON_INDENT
  );
};

/** Add a common key with an example value so users see the expected type. */
const addKey = (key: string, example: unknown) => {
  const definition = parsedDefinition.value ?? {};
  definitionText.value = JSON.stringify(
    { ...definition, [key]: definition[key] ?? example },
    null,
    JSON_INDENT
  );
};

const submit = () => {
  if (!canSubmit.value || !parsedDefinition.value) return;

  emit('save', {
    policy: {
      kind: kind.value,
      vhost: vhost.value,
      name: name.value.trim(),
      pattern: pattern.value,
      applyTo: applyTo.value,
      priority: parsedPriority.value,
      definition: parsedDefinition.value,
    },
    previousName: props.policy?.name,
  });
};

watch(open, value => {
  if (value) resetForm();
});
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ policy ? 'Edit policy' : 'Add policy' }}</DialogTitle>
        <DialogDescription>
          Policies set queue and exchange options by name pattern. Operator
          policies cap what user policies may set.
        </DialogDescription>
      </DialogHeader>

      <form id="rabbit-policy-form" class="space-y-3" @submit.prevent="submit">
        <div class="grid grid-cols-2 gap-2">
          <div class="space-y-1.5">
            <Label for="rabbit-policy-kind">Kind</Label>
            <Select v-model="kind" :disabled="Boolean(policy)">
              <SelectTrigger id="rabbit-policy-kind" class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="item in allowedKinds"
                  :key="item"
                  :value="item"
                >
                  {{ item === 'user' ? 'User policy' : 'Operator policy' }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5">
            <Label for="rabbit-policy-vhost">Virtual host</Label>
            <Select v-model="vhost" :disabled="Boolean(policy)">
              <SelectTrigger id="rabbit-policy-vhost" class="w-full">
                <SelectValue placeholder="Choose a virtual host" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="item in vhosts" :key="item" :value="item">
                  {{ item }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5">
            <Label for="rabbit-policy-name">
              Name <span class="text-destructive">*</span>
            </Label>
            <Input id="rabbit-policy-name" v-model="name" />
          </div>
          <div class="space-y-1.5">
            <Label for="rabbit-policy-pattern">Pattern (regex)</Label>
            <Input
              id="rabbit-policy-pattern"
              v-model="pattern"
              class="font-mono text-xs"
            />
          </div>
          <div class="space-y-1.5">
            <Label for="rabbit-policy-apply-to">Apply to</Label>
            <Select v-model="applyTo">
              <SelectTrigger id="rabbit-policy-apply-to" class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="item in RABBIT_POLICY_APPLY_TO"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5">
            <Label for="rabbit-policy-priority">Priority</Label>
            <Input
              id="rabbit-policy-priority"
              v-model="priority"
              type="number"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <Label for="rabbit-policy-definition">Definition (JSON)</Label>
          <Textarea
            id="rabbit-policy-definition"
            v-model="definitionText"
            rows="6"
            class="font-mono text-xs"
          />
          <p v-if="parsedDefinition === null" class="text-xs text-destructive">
            {{ DEFINITION_ERROR }}
          </p>
          <div class="flex flex-wrap gap-1">
            <Button
              v-for="hint in RABBIT_POLICY_KEY_HINTS"
              :key="hint.key"
              type="button"
              size="xxs"
              variant="outline"
              class="font-mono"
              @click="addKey(hint.key, hint.example)"
            >
              + {{ hint.key }}
            </Button>
          </div>
        </div>
      </form>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" @click="open = false">
          Cancel
        </Button>
        <Button
          type="submit"
          form="rabbit-policy-form"
          size="sm"
          :disabled="!canSubmit"
        >
          <Icon
            v-if="isSaving"
            name="hugeicons:loading-03"
            class="size-4 animate-spin"
          />
          Save
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
