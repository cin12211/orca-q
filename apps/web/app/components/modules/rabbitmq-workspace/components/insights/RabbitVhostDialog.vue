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
  RabbitVhostInput,
  RabbitVhostSummary,
} from '~/core/types/rabbitmq.types';
import { RABBIT_QUEUE_TYPES } from '../../constants';

const props = defineProps<{
  /** Null to create a new virtual host. */
  vhost: RabbitVhostSummary | null;
  isSaving: boolean;
}>();

const emit = defineEmits<{ (e: 'save', value: RabbitVhostInput): void }>();

const open = defineModel<boolean>('open', { required: true });

const name = ref('');
const description = ref('');
const tagsText = ref('');
const defaultQueueType = ref<RabbitVhostInput['defaultQueueType']>('classic');
const isTracing = ref(false);

const isNew = computed(() => !props.vhost);
const canSubmit = computed(() => Boolean(name.value.trim()) && !props.isSaving);

const resetForm = () => {
  name.value = props.vhost?.name ?? '';
  description.value = props.vhost?.description ?? '';
  tagsText.value = props.vhost?.tags.join(', ') ?? '';
  defaultQueueType.value = RABBIT_QUEUE_TYPES.includes(
    props.vhost?.defaultQueueType as RabbitVhostInput['defaultQueueType']
  )
    ? (props.vhost?.defaultQueueType as RabbitVhostInput['defaultQueueType'])
    : 'classic';
  isTracing.value = props.vhost?.isTracing ?? false;
};

const submit = () => {
  if (!canSubmit.value) return;

  emit('save', {
    name: name.value.trim(),
    description: description.value.trim(),
    tags: tagsText.value
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean),
    defaultQueueType: defaultQueueType.value,
    isTracing: isTracing.value,
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
          {{ isNew ? 'Add virtual host' : `Edit virtual host ${vhost?.name}` }}
        </DialogTitle>
        <DialogDescription>
          Virtual hosts isolate queues, exchanges, users' permissions and
          policies.
        </DialogDescription>
      </DialogHeader>

      <form id="rabbit-vhost-form" class="space-y-3" @submit.prevent="submit">
        <div class="space-y-1.5">
          <Label for="rabbit-vhost-name">
            Name <span class="text-destructive">*</span>
          </Label>
          <Input id="rabbit-vhost-name" v-model="name" :disabled="!isNew" />
        </div>
        <div class="space-y-1.5">
          <Label for="rabbit-vhost-description">Description</Label>
          <Input id="rabbit-vhost-description" v-model="description" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="space-y-1.5">
            <Label for="rabbit-vhost-tags">Tags</Label>
            <Input
              id="rabbit-vhost-tags"
              v-model="tagsText"
              placeholder="production, eu"
            />
          </div>
          <div class="space-y-1.5">
            <Label for="rabbit-vhost-queue-type">Default queue type</Label>
            <Select v-model="defaultQueueType">
              <SelectTrigger id="rabbit-vhost-queue-type" class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="type in RABBIT_QUEUE_TYPES"
                  :key="type"
                  :value="type"
                >
                  {{ type }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <Switch id="rabbit-vhost-tracing" v-model:model-value="isTracing" />
          Enable message tracing (firehose)
        </label>
      </form>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" @click="open = false">
          Cancel
        </Button>
        <Button
          type="submit"
          form="rabbit-vhost-form"
          size="sm"
          :disabled="!canSubmit"
        >
          <Icon
            v-if="isSaving"
            name="hugeicons:loading-03"
            class="size-4 animate-spin"
          />
          {{ isNew ? 'Add virtual host' : 'Save' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
