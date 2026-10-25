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
import { RABBIT_DEFAULT_EXCHANGE_LABEL } from '../constants';
import { rabbitmqService } from '../services';

const props = defineProps<{
  connection: Connection;
  vhost: string;
  exchange: string;
  defaultRoutingKey?: string;
}>();

const open = defineModel<boolean>('open', { required: true });

const { checkAndConfirm } = useStrictModeGuard();
const routingKey = ref('');
const payload = ref('');
const headersText = ref('');
const contentType = ref('application/json');
const isPersistent = ref(true);
const isSending = ref(false);
const headersError = ref<string | null>(null);

watch(open, value => {
  if (!value) return;
  routingKey.value = props.defaultRoutingKey ?? '';
  headersError.value = null;
});

const publish = async () => {
  const parsed = parseBrokerHeaders(headersText.value);
  headersError.value = 'error' in parsed ? parsed.error : null;
  if ('error' in parsed) return;
  const { headers } = parsed;
  if (!(await checkAndConfirm(props.connection))) return;

  isSending.value = true;

  try {
    const result = await rabbitmqService.publish(props.connection, {
      vhost: props.vhost,
      exchange: props.exchange,
      routingKey: routingKey.value,
      payload: payload.value,
      headers,
      contentType: contentType.value || undefined,
      isPersistent: isPersistent.value,
    });

    if (result.isRouted) {
      toast.success('Message published');
      open.value = false;
    } else {
      toast.warning('Published, but no queue is bound for this routing key', {
        description: 'The broker dropped the message.',
      });
    }
  } catch (error) {
    toast.error('Could not publish the message', {
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
        <DialogTitle>Publish test message</DialogTitle>
        <DialogDescription>
          Exchange
          <span class="font-mono">{{
            exchange || RABBIT_DEFAULT_EXCHANGE_LABEL
          }}</span>
          in vhost <span class="font-mono">{{ vhost }}</span
          >. Real consumers will receive this message.
        </DialogDescription>
      </DialogHeader>

      <form
        id="rabbit-publish-form"
        class="space-y-3"
        @submit.prevent="publish"
      >
        <div class="grid grid-cols-2 gap-2">
          <div class="space-y-1.5">
            <Label for="rabbit-publish-routing-key">Routing key</Label>
            <Input
              id="rabbit-publish-routing-key"
              v-model="routingKey"
              class="font-mono"
            />
          </div>
          <div class="space-y-1.5">
            <Label for="rabbit-publish-content-type">Content type</Label>
            <Input
              id="rabbit-publish-content-type"
              v-model="contentType"
              class="font-mono"
            />
          </div>
        </div>
        <div class="space-y-1.5">
          <Label for="rabbit-publish-payload">Payload</Label>
          <Textarea
            id="rabbit-publish-payload"
            v-model="payload"
            class="font-mono text-xs min-h-32"
            placeholder='{"orderId": 1}'
          />
        </div>
        <div class="space-y-1.5">
          <Label for="rabbit-publish-headers">Headers (JSON, optional)</Label>
          <Textarea
            id="rabbit-publish-headers"
            v-model="headersText"
            class="font-mono text-xs min-h-14"
            placeholder='{"source": "orcaq"}'
          />
          <p v-if="headersError" class="text-xs text-destructive">
            {{ headersError }}
          </p>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <Switch
            id="rabbit-publish-persistent"
            v-model:model-value="isPersistent"
          />
          <label for="rabbit-publish-persistent" class="cursor-pointer"
            >Persistent (delivery mode 2)</label
          >
        </div>
      </form>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" @click="open = false"
          >Cancel</Button
        >
        <Button
          type="submit"
          form="rabbit-publish-form"
          size="sm"
          :disabled="isSending"
        >
          <Icon
            v-if="isSending"
            name="hugeicons:loading-03"
            class="size-4 animate-spin"
          />
          Publish
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
