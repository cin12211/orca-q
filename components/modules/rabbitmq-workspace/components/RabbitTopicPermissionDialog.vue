<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { RabbitTopicPermission } from '~/core/types/rabbitmq.types';
import { RABBIT_FULL_ACCESS_PATTERN } from '../constants';

const TOPIC_EXCHANGE_TYPE = 'topic';

const props = defineProps<{
  userName: string;
  vhosts: string[];
  /** Loads the exchanges of a vhost so only topic exchanges are offered. */
  loadExchanges: (vhost: string) => Promise<{ name: string; type: string }[]>;
  initial: RabbitTopicPermission | null;
  isSaving: boolean;
}>();

const emit = defineEmits<{ (e: 'save', value: RabbitTopicPermission): void }>();

const open = defineModel<boolean>('open', { required: true });

const vhost = ref('');
const exchange = ref('');
const write = ref(RABBIT_FULL_ACCESS_PATTERN);
const read = ref(RABBIT_FULL_ACCESS_PATTERN);
const topicExchanges = ref<string[]>([]);
const isLoadingExchanges = ref(false);

const canSubmit = computed(
  () => Boolean(vhost.value && exchange.value) && !props.isSaving
);

const loadTopicExchanges = async (target: string) => {
  topicExchanges.value = [];
  if (!target) return;

  isLoadingExchanges.value = true;

  try {
    const exchanges = await props.loadExchanges(target);
    topicExchanges.value = exchanges
      .filter(item => item.type === TOPIC_EXCHANGE_TYPE && item.name)
      .map(item => item.name)
      .sort((left, right) => left.localeCompare(right));
  } finally {
    isLoadingExchanges.value = false;
  }
};

const resetForm = () => {
  vhost.value = props.initial?.vhost ?? props.vhosts[0] ?? '';
  exchange.value = props.initial?.exchange ?? '';
  write.value = props.initial?.write ?? RABBIT_FULL_ACCESS_PATTERN;
  read.value = props.initial?.read ?? RABBIT_FULL_ACCESS_PATTERN;
};

const submit = () => {
  if (!canSubmit.value) return;

  emit('save', {
    vhost: vhost.value,
    exchange: exchange.value,
    write: write.value,
    read: read.value,
  });
};

watch(open, value => {
  if (value) resetForm();
});

watch(vhost, async (value, previous) => {
  if (previous && !props.initial) exchange.value = '';
  await loadTopicExchanges(value);
});
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>
          {{ initial ? 'Edit topic permission' : 'Set topic permission' }}
        </DialogTitle>
        <DialogDescription>
          Limit which routing keys {{ userName }} may publish or consume on a
          topic exchange.
        </DialogDescription>
      </DialogHeader>

      <form
        id="rabbit-topic-permission-form"
        class="space-y-4"
        @submit.prevent="submit"
      >
        <div class="grid grid-cols-2 gap-2">
          <div class="space-y-1.5">
            <Label for="rabbit-topic-vhost">Virtual host</Label>
            <Select v-model="vhost" :disabled="Boolean(initial)">
              <SelectTrigger id="rabbit-topic-vhost" class="w-full">
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
            <Label for="rabbit-topic-exchange">Topic exchange</Label>
            <Select
              v-model="exchange"
              :disabled="Boolean(initial) || isLoadingExchanges"
            >
              <SelectTrigger id="rabbit-topic-exchange" class="w-full">
                <SelectValue
                  :placeholder="
                    isLoadingExchanges ? 'Loading...' : 'Choose an exchange'
                  "
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="item in initial ? [initial.exchange] : topicExchanges"
                  :key="item"
                  :value="item"
                >
                  {{ item }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div class="space-y-1">
            <Label for="rabbit-topic-write" class="text-xs">
              Write (routing key)
            </Label>
            <Input
              id="rabbit-topic-write"
              v-model="write"
              class="font-mono text-xs"
            />
          </div>
          <div class="space-y-1">
            <Label for="rabbit-topic-read" class="text-xs">
              Read (routing key)
            </Label>
            <Input
              id="rabbit-topic-read"
              v-model="read"
              class="font-mono text-xs"
            />
          </div>
        </div>
        <p class="text-xs text-muted-foreground">
          Regular expressions on routing keys. Leave a field empty to deny it.
        </p>
      </form>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" @click="open = false">
          Cancel
        </Button>
        <Button
          type="submit"
          form="rabbit-topic-permission-form"
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
