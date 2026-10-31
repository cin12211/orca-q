<script setup lang="ts">
import type { Connection } from '~/core/stores';
import {
  TabViewType,
  type TabView,
} from '~/core/types/entities/tab-view.entity';
import {
  RabbitConnectionsPanel,
  RabbitDefinitionsPanel,
  RabbitExchangeDetail,
  RabbitQueueDetail,
  RabbitQueueList,
  RabbitUserDetail,
} from '../components';

const props = defineProps<{ connection: Connection; tabInfo: TabView }>();

const metadata = computed(
  () => (props.tabInfo.metadata ?? {}) as Record<string, string>
);
</script>

<template>
  <RabbitQueueDetail
    v-if="tabInfo.type === TabViewType.RabbitQueueDetail"
    :connection="connection"
    :vhost="metadata.vhost"
    :queue-name="metadata.queueName"
  />
  <RabbitExchangeDetail
    v-else-if="tabInfo.type === TabViewType.RabbitExchangeDetail"
    :connection="connection"
    :vhost="metadata.vhost"
    :exchange-name="metadata.exchangeName ?? ''"
  />
  <RabbitQueueList
    v-else-if="tabInfo.type === TabViewType.RabbitQueueList"
    :connection="connection"
    :vhost="metadata.vhost"
  />
  <RabbitUserDetail
    v-else-if="tabInfo.type === TabViewType.RabbitUserDetail"
    :connection="connection"
    :user-name="metadata.userName"
  />
  <RabbitDefinitionsPanel
    v-else-if="tabInfo.type === TabViewType.RabbitDefinitions"
    :connection="connection"
    :initial-mode="metadata.mode === 'import' ? 'import' : 'export'"
  />
  <RabbitConnectionsPanel v-else :connection="connection" />
</template>
