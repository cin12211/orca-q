<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { RabbitUserPermission } from '~/core/types/rabbitmq.types';
import {
  RABBIT_FULL_ACCESS_PATTERN,
  RABBIT_PERMISSION_DESCRIPTIONS,
} from '../constants';

const props = defineProps<{
  userName: string;
  vhosts: string[];
  /** Set when editing an existing row; the vhost is then fixed. */
  initial: RabbitUserPermission | null;
  isSaving: boolean;
}>();

const emit = defineEmits<{ (e: 'save', value: RabbitUserPermission): void }>();

const open = defineModel<boolean>('open', { required: true });

const vhost = ref('');
const configure = ref(RABBIT_FULL_ACCESS_PATTERN);
const write = ref(RABBIT_FULL_ACCESS_PATTERN);
const read = ref(RABBIT_FULL_ACCESS_PATTERN);

const fields = [
  { key: 'configure', label: 'Configure', model: configure },
  { key: 'write', label: 'Write', model: write },
  { key: 'read', label: 'Read', model: read },
] as const;

const canSubmit = computed(() => Boolean(vhost.value) && !props.isSaving);

const resetForm = () => {
  vhost.value = props.initial?.vhost ?? props.vhosts[0] ?? '';
  configure.value = props.initial?.configure ?? RABBIT_FULL_ACCESS_PATTERN;
  write.value = props.initial?.write ?? RABBIT_FULL_ACCESS_PATTERN;
  read.value = props.initial?.read ?? RABBIT_FULL_ACCESS_PATTERN;
};

const submit = () => {
  if (!canSubmit.value) return;

  emit('save', {
    vhost: vhost.value,
    configure: configure.value,
    write: write.value,
    read: read.value,
  });
};

watch(open, value => {
  if (value) resetForm();
});
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>
          {{ initial ? 'Edit permission' : 'Set permission' }}
        </DialogTitle>
        <DialogDescription>
          What {{ userName }} may do on one virtual host.
        </DialogDescription>
      </DialogHeader>

      <form
        id="rabbit-permission-form"
        class="space-y-4"
        @submit.prevent="submit"
      >
        <div class="space-y-1.5">
          <Label for="rabbit-permission-vhost">Virtual host</Label>
          <Select v-model="vhost" :disabled="Boolean(initial)">
            <SelectTrigger id="rabbit-permission-vhost" class="w-full">
              <SelectValue placeholder="Choose a virtual host" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="item in vhosts" :key="item" :value="item">
                {{ item }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <div v-for="field in fields" :key="field.key" class="space-y-1">
            <Label
              :for="`rabbit-permission-${field.key}`"
              class="text-xs"
              :title="RABBIT_PERMISSION_DESCRIPTIONS[field.key]"
            >
              {{ field.label }}
            </Label>
            <Input
              :id="`rabbit-permission-${field.key}`"
              v-model="field.model.value"
              class="font-mono text-xs"
            />
          </div>
        </div>
        <p class="text-xs text-muted-foreground">
          Regular expressions on queue and exchange names. Leave a field empty
          to deny it, ".*" allows everything.
        </p>
      </form>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" @click="open = false">
          Cancel
        </Button>
        <Button
          type="submit"
          form="rabbit-permission-form"
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
