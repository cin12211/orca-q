<script setup lang="ts">
import { Badge } from '@/components/ui/badge';
import RedisDBSelector from '~/components/modules/selectors/RedisDBSelector.vue';
import type { Connection } from '~/core/stores';
import type {
  RedisDatabaseOption,
  RedisPubSubMessage,
  RedisPubSubMessagesResponse,
  RedisPubSubOverview,
  RedisPubSubSubscriptionStatus,
} from '~/core/types/redis-workspace.types';

const props = defineProps<{
  connection?: Connection;
  databaseIndex: number;
  databases: RedisDatabaseOption[];
}>();

const emit = defineEmits<{
  (e: 'update:databaseIndex', value: number): void;
}>();

const overview = shallowRef<RedisPubSubOverview | null>(null);
const messages = ref<RedisPubSubMessage[]>([]);
const target = ref('');
const publishChannel = ref('');
const publishPayload = ref('');
const sessionId = ref<string | null>(null);
const loadingOverview = ref(false);
const subscribing = ref(false);
const publishing = ref(false);

let pollHandle: ReturnType<typeof setInterval> | null = null;

const subscription = computed<RedisPubSubSubscriptionStatus>(() => {
  return (
    overview.value?.subscription ?? {
      sessionId: sessionId.value,
      target: null,
      mode: null,
      targets: [],
    }
  );
});

const subscriptionTargets = computed(() => subscription.value.targets ?? []);

const summaryBadges = computed(() => [
  { label: `${overview.value?.channels.length ?? 0} channels` },
  { label: `${overview.value?.patternCount ?? 0} patterns` },
  {
    label: subscriptionTargets.value.length
      ? `${subscriptionTargets.value.length} active target${subscriptionTargets.value.length === 1 ? '' : 's'}`
      : 'Not subscribed',
  },
]);

const orderedMessages = computed(() => messages.value.slice().reverse());

const buildConnectionBody = (connection: Connection) => ({
  method: connection.method,
  stringConnection: connection.connectionString,
  host: connection.host,
  port: connection.port,
  username: connection.username,
  password: connection.password,
  database: connection.database,
  ssl: connection.ssl,
  ssh: connection.ssh,
});

const loadOverview = async () => {
  if (!props.connection) {
    overview.value = null;
    return;
  }

  loadingOverview.value = true;

  try {
    overview.value = await $fetch<RedisPubSubOverview>(
      '/api/redis/pubsub/overview',
      {
        method: 'POST',
        body: {
          ...buildConnectionBody(props.connection),
          databaseIndex: props.databaseIndex,
          sessionId: sessionId.value,
        },
      }
    );
  } finally {
    loadingOverview.value = false;
  }
};

const loadMessages = async () => {
  if (!sessionId.value) {
    messages.value = [];
    return;
  }

  const response = await $fetch<RedisPubSubMessagesResponse>(
    '/api/redis/pubsub/messages',
    {
      method: 'POST',
      body: {
        sessionId: sessionId.value,
      },
    }
  );

  messages.value = response.messages;

  if (overview.value) {
    overview.value = {
      ...overview.value,
      subscription: response.subscription,
    };
  }
};

const refreshPubSub = async () => {
  await Promise.all([loadOverview(), loadMessages()]);
};

const stopPolling = () => {
  if (pollHandle) {
    clearInterval(pollHandle);
    pollHandle = null;
  }
};

const ensurePolling = () => {
  stopPolling();
  pollHandle = setInterval(() => {
    refreshPubSub();
  }, 2000);
};

const subscribeToTarget = async () => {
  if (!props.connection || !target.value.trim()) {
    return;
  }

  subscribing.value = true;

  try {
    const response = await $fetch<RedisPubSubMessagesResponse>(
      '/api/redis/pubsub/subscribe',
      {
        method: 'POST',
        body: {
          ...buildConnectionBody(props.connection),
          databaseIndex: props.databaseIndex,
          target: target.value.trim(),
          sessionId: sessionId.value,
        },
      }
    );

    sessionId.value = response.subscription.sessionId;
    messages.value = response.messages;
    target.value = '';

    const nextPublishTarget = response.subscription.targets.find(
      item => item.mode === 'channel'
    );

    if (!publishChannel.value && nextPublishTarget) {
      publishChannel.value = nextPublishTarget.target;
    }

    await loadOverview();
    ensurePolling();
  } finally {
    subscribing.value = false;
  }
};

const unsubscribeFromTarget = async (selectedTarget?: string) => {
  if (!sessionId.value) {
    return;
  }

  const activeSessionId = sessionId.value;
  const response = await $fetch<{ closed: boolean }>(
    '/api/redis/pubsub/unsubscribe',
    {
      method: 'POST',
      body: {
        sessionId: activeSessionId,
        target: selectedTarget ?? null,
      },
    }
  );

  if (!selectedTarget || response.closed) {
    sessionId.value = null;
    messages.value = [];
    stopPolling();
    await loadOverview();
    return;
  }

  await refreshPubSub();

  if ((overview.value?.subscription.targets.length ?? 0) === 0) {
    sessionId.value = null;
    messages.value = [];
    stopPolling();
  }
};

const publishMessage = async () => {
  if (!props.connection || !publishChannel.value.trim()) {
    return;
  }

  publishing.value = true;

  try {
    await $fetch('/api/redis/pubsub/publish', {
      method: 'POST',
      body: {
        ...buildConnectionBody(props.connection),
        databaseIndex: props.databaseIndex,
        channel: publishChannel.value.trim(),
        payload: publishPayload.value,
      },
    });

    publishPayload.value = '';
    await refreshPubSub();
  } finally {
    publishing.value = false;
  }
};

watch(
  () => overview.value?.subscription.sessionId,
  value => {
    sessionId.value = value ?? null;
  }
);

watch(
  subscriptionTargets,
  targets => {
    if (targets.length === 0) {
      if (sessionId.value) {
        stopPolling();
      }

      return;
    }

    if (!publishChannel.value) {
      const firstChannelTarget = targets.find(item => item.mode === 'channel');

      if (firstChannelTarget) {
        publishChannel.value = firstChannelTarget.target;
      }
    }
  },
  { immediate: true }
);

watch(sessionId, value => {
  if (value) {
    ensurePolling();
    return;
  }

  stopPolling();
});

watch(
  () => [props.connection?.id, props.databaseIndex],
  async () => {
    stopPolling();

    if (sessionId.value) {
      await unsubscribeFromTarget();
      return;
    }

    messages.value = [];
    await loadOverview();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  stopPolling();

  if (sessionId.value) {
    $fetch('/api/redis/pubsub/unsubscribe', {
      method: 'POST',
      body: {
        sessionId: sessionId.value,
        target: null,
      },
    }).catch(() => undefined);
  }
});
</script>

<template>
  <div class="flex h-full flex-col gap-4 overflow-hidden p-4">
    <div
      class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
    >
      <div class="space-y-1">
        <div class="text-sm font-semibold">Redis Pub/Sub</div>
        <div class="text-xs text-muted-foreground">
          Subscribe to a channel or pattern, publish test events, and watch live
          messages without leaving the detail flow.
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <RedisDBSelector
          compact
          trigger-id="redis-pubsub-db-index"
          trigger-class="bg-background"
          :databases="databases"
          :database-index="databaseIndex"
          @update:database-index="emit('update:databaseIndex', $event)"
        />

        <Button
          variant="ghost"
          size="sm"
          class="h-7 px-2 text-xs"
          :disabled="loadingOverview"
          @click="refreshPubSub"
        >
          <Icon name="hugeicons:redo" class="size-3.5! min-w-3.5" />
          Refresh
        </Button>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <Badge
        v-for="badge in summaryBadges"
        :key="badge.label"
        variant="outline"
        class="h-6 px-2 text-[11px] font-normal"
      >
        {{ badge.label }}
      </Badge>
    </div>

    <div class="grid min-h-0 flex-1 gap-4 grid-cols-5">
      <div class="flex min-h-0 flex-col gap-4 col-span-2">
        <div class="rounded-lg border bg-background p-4 space-y-4">
          <div class="space-y-3">
            <div>
              <div>
                <div class="text-sm font-medium">Subscription</div>
                <p class="text-xs text-muted-foreground">
                  Add channels or wildcard patterns to the same live session.
                  Pattern detection is automatic.
                </p>
              </div>
            </div>

            <div class="space-y-2">
              <Label for="redis-pubsub-target">Target</Label>
              <Input
                id="redis-pubsub-target"
                v-model="target"
                placeholder="orders.events or orders.*"
              />
              <p class="text-xs text-muted-foreground">
                Use a plain channel name or include wildcard characters like
                <span class="font-mono">*</span> and
                <span class="font-mono">?</span> for patterns.
              </p>
            </div>

            <div class="flex flex-wrap gap-2">
              <Button
                size="sm"
                :disabled="subscribing"
                @click="subscribeToTarget"
              >
                Add target
              </Button>
              <Button
                size="sm"
                variant="outline"
                :disabled="!sessionId"
                @click="unsubscribeFromTarget(undefined)"
              >
                Clear all
              </Button>
            </div>

            <div v-if="subscriptionTargets.length" class="space-y-2">
              <div
                class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground"
              >
                Active targets
              </div>

              <div class="space-y-2">
                <div
                  v-for="subscriptionTarget in subscriptionTargets"
                  :key="subscriptionTarget.target"
                  class="flex items-center justify-between gap-3 rounded-lg border bg-muted/10 px-3 py-2"
                >
                  <div class="min-w-0">
                    <div class="truncate text-sm font-medium">
                      {{ subscriptionTarget.target }}
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {{
                        subscriptionTarget.mode === 'pattern'
                          ? 'Pattern detected automatically'
                          : 'Channel detected automatically'
                      }}
                    </div>
                  </div>

                  <Button
                    size="iconSm"
                    variant="ghost"
                    :aria-label="`Remove ${subscriptionTarget.target}`"
                    @click="unsubscribeFromTarget(subscriptionTarget.target)"
                  >
                    <Icon name="hugeicons:cancel-01" class="size-4! min-w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-lg border bg-background p-4 space-y-4">
          <div>
            <div class="text-sm font-medium">Publish</div>
            <p class="text-xs text-muted-foreground">
              Send a quick payload to a channel and inspect the response stream
              on the right.
            </p>
          </div>

          <div class="space-y-2">
            <Label for="redis-pubsub-channel">Channel</Label>
            <Input
              id="redis-pubsub-channel"
              v-model="publishChannel"
              placeholder="orders.events"
            />
          </div>

          <div class="space-y-2">
            <Label for="redis-pubsub-payload">Payload</Label>
            <textarea
              id="redis-pubsub-payload"
              v-model="publishPayload"
              class="min-h-[140px] w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono"
              placeholder='{"event":"order.created"}'
            />
          </div>

          <div class="flex justify-end">
            <Button size="sm" :disabled="publishing" @click="publishMessage">
              Publish
            </Button>
          </div>
        </div>
      </div>

      <div
        class="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background col-span-3"
      >
        <div class="border-b px-4 py-3">
          <div class="flex flex-wrap items-center gap-2">
            <div class="text-sm font-medium">Live Messages</div>
            <Badge variant="outline" class="h-5 px-1.5 text-xxs font-normal">
              {{ orderedMessages.length }} messages
            </Badge>
            <Badge variant="outline" class="h-5 px-1.5 text-xxs font-normal">
              Polling 2s
            </Badge>
          </div>
          <div class="mt-1 text-xs text-muted-foreground">
            Message polling stays active while the current subscription session
            is connected.
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-auto p-4">
          <BaseEmpty
            v-if="orderedMessages.length === 0"
            title="No Pub/Sub messages yet"
            desc="Subscribe to a channel or pattern, then publish an event to watch it appear here."
          />

          <div v-else class="space-y-3">
            <div
              v-for="message in orderedMessages"
              :key="message.id"
              class="rounded-lg border bg-muted/10 p-3"
            >
              <div
                class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
              >
                <Badge
                  variant="outline"
                  class="h-5 px-1.5 text-xxs font-normal text-foreground"
                >
                  {{ message.channel }}
                </Badge>
                <Badge
                  v-if="message.pattern"
                  variant="outline"
                  class="h-5 px-1.5 text-xxs font-normal"
                >
                  Pattern {{ message.pattern }}
                </Badge>
                <span>{{
                  new Date(message.receivedAt).toLocaleTimeString()
                }}</span>
              </div>

              <pre
                class="mt-2 overflow-auto rounded-md border bg-background p-3 text-xs"
              ><code>{{ message.payload }}</code></pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
