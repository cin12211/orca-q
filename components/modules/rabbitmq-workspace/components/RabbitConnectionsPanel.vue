<script setup lang="ts">
import { useBrokerRequest } from '~/components/modules/shared/message-broker';
import type { Connection } from '~/core/stores';
import {
  RABBIT_ADMINISTRATOR_TAG,
  RABBIT_DEFAULT_REFRESH_MS,
} from '../constants';
import { rabbitmqService } from '../services';
import {
  RabbitInsightsChannelsSection,
  RabbitInsightsConnectionsSection,
} from './insights';

const props = defineProps<{ connection: Connection }>();

/** Only read to know whether the connected user may close connections. */
const overview = useBrokerRequest(() =>
  rabbitmqService.overview(props.connection)
);
const refreshKey = ref(0);

const canManage = computed(() =>
  Boolean(
    overview.data.value?.currentUser.tags.includes(RABBIT_ADMINISTRATOR_TAG)
  )
);

onMounted(() => overview.load());
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3">
    <ToolPageHeader
      icon="hugeicons:plug-socket"
      title="Connections & Channels"
      description="Clients connected to the broker, with prefetch and unacked messages per channel."
    >
      <template #actions>
        <Button size="xxs" variant="outline" @click="refreshKey++">
          <Icon name="hugeicons:redo" class="size-3.5!" />
          Refresh
        </Button>
      </template>
    </ToolPageHeader>

    <section class="space-y-2">
      <h3
        class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        Connections
      </h3>
      <RabbitInsightsConnectionsSection
        :connection="connection"
        :can-manage="canManage"
        :refresh-key="refreshKey"
        :interval-ms="RABBIT_DEFAULT_REFRESH_MS"
      />
    </section>

    <section class="space-y-2">
      <h3
        class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        Channels
      </h3>
      <RabbitInsightsChannelsSection
        :connection="connection"
        :refresh-key="refreshKey"
        :interval-ms="RABBIT_DEFAULT_REFRESH_MS"
      />
    </section>
  </div>
</template>
