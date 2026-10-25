<script setup lang="ts">
import { toast } from 'vue-sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useStrictModeGuard } from '~/components/modules/environment-tag';
import {
  getBrokerErrorMessage,
  parseBrokerHeaders,
} from '~/components/modules/message-broker';
import type { Connection } from '~/core/stores';
import { kafkaService } from '../services';

const AUTO_PARTITION = 'auto';

const props = defineProps<{
  connection: Connection;
  topicName: string;
  partitionCount: number;
}>();

const open = defineModel<boolean>('open', { required: true });

const { checkAndConfirm } = useStrictModeGuard();
const key = ref('');
const value = ref('');
const headersText = ref('');
const partition = ref<string>(AUTO_PARTITION);
const isSending = ref(false);
const headersError = ref<string | null>(null);

const produce = async () => {
  const parsed = parseBrokerHeaders(headersText.value);
  headersError.value = 'error' in parsed ? parsed.error : null;
  if ('error' in parsed) return;
  const { headers } = parsed;
  if (!(await checkAndConfirm(props.connection))) return;

  isSending.value = true;

  try {
    const result = await kafkaService.produce(props.connection, {
      topic: props.topicName,
      key: key.value || undefined,
      value: value.value,
      headers,
      partition:
        partition.value === AUTO_PARTITION
          ? undefined
          : Number(partition.value),
    });

    toast.success('Message produced', {
      description:
        result.offset === null
          ? undefined
          : `Partition ${result.partition}, offset ${result.offset}`,
    });
    open.value = false;
  } catch (error) {
    toast.error('Could not produce the message', {
      description: getBrokerErrorMessage(error),
    });
  } finally {
    isSending.value = false;
  }
};
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-xl">
      <DialogHeader>
        <DialogTitle>Produce test message</DialogTitle>
        <DialogDescription>
          Topic <span class="font-mono">{{ topicName }}</span
          >. Real consumers will receive this message.
        </DialogDescription>
      </DialogHeader>

      <form id="kafka-produce-form" class="space-y-3" @submit.prevent="produce">
        <div class="grid grid-cols-2 gap-2">
          <div class="space-y-1.5">
            <Label for="kafka-produce-key">Key (optional)</Label>
            <Input id="kafka-produce-key" v-model="key" class="font-mono" />
          </div>
          <div class="space-y-1.5">
            <Label for="kafka-produce-partition">Partition</Label>
            <Select v-model="partition">
              <SelectTrigger id="kafka-produce-partition" class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="AUTO_PARTITION"
                  >By key (default)</SelectItem
                >
                <SelectItem
                  v-for="index in partitionCount"
                  :key="index"
                  :value="String(index - 1)"
                >
                  {{ index - 1 }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div class="space-y-1.5">
          <Label for="kafka-produce-value">Value</Label>
          <Textarea
            id="kafka-produce-value"
            v-model="value"
            class="font-mono text-xs min-h-32"
            placeholder='{"orderId": 1}'
          />
        </div>
        <div class="space-y-1.5">
          <Label for="kafka-produce-headers">Headers (JSON, optional)</Label>
          <Textarea
            id="kafka-produce-headers"
            v-model="headersText"
            class="font-mono text-xs min-h-14"
            placeholder='{"source": "orcaq"}'
          />
          <p v-if="headersError" class="text-xs text-destructive">
            {{ headersError }}
          </p>
        </div>
      </form>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" @click="open = false"
          >Cancel</Button
        >
        <Button
          type="submit"
          form="kafka-produce-form"
          size="sm"
          :disabled="isSending"
        >
          <Icon
            v-if="isSending"
            name="hugeicons:loading-03"
            class="size-4 animate-spin"
          />
          Produce
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
