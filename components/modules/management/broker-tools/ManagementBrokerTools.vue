<script setup lang="ts">
import { useTabManagement } from '~/core/composables/useTabManagement';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { useManagementConnectionStore } from '~/core/stores';
import { TabViewType } from '~/core/types/entities/tab-view.entity';
import { ManagementSidebarHeader } from '../shared';

interface ToolItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  open: () => Promise<void>;
}

const connectionStore = useManagementConnectionStore();
const { openInstanceInsightsTab, openBrokerTab } = useTabManagement();
const { workspaceId } = useWorkspaceConnectionRoute();
const connection = computed(() => connectionStore.selectedConnection);
const isKafka = computed(
  () => connection.value?.type === DatabaseClientType.KAFKA
);
const tabId = (suffix: string) =>
  `${suffix}-${connection.value?.id ?? 'broker'}`;

const openOverview = () =>
  openInstanceInsightsTab({
    databaseName:
      connection.value?.name || (isKafka.value ? 'Kafka' : 'RabbitMQ'),
  });

const rabbitTools: ToolItem[] = [
  {
    id: 'overview',
    title: 'Overview',
    description: 'Broker health, node alarms, backlog and message rates.',
    icon: 'hugeicons:activity-02',
    open: openOverview,
  },
  {
    id: 'connections',
    title: 'Connections & Channels',
    description:
      'Connected clients, prefetch and unacked messages per channel.',
    icon: 'hugeicons:plug-socket',
    open: () =>
      openBrokerTab({
        id: tabId('rabbit-connections'),
        name: 'Connections',
        type: TabViewType.RabbitConnections,
        icon: 'hugeicons:plug-socket',
      }),
  },
];

const kafkaTools: ToolItem[] = [
  {
    id: 'overview',
    title: 'Cluster Overview',
    description: 'Brokers, controller and partitions without enough replicas.',
    icon: 'hugeicons:activity-02',
    open: openOverview,
  },
  {
    id: 'topics',
    title: 'Topics',
    description: 'Every topic with partitions, messages and size.',
    icon: 'hugeicons:list-view',
    open: () =>
      openBrokerTab({
        id: tabId('kafka-topics'),
        name: 'Topics',
        type: TabViewType.KafkaTopicList,
        icon: 'hugeicons:list-view',
      }),
  },
  {
    id: 'groups',
    title: 'Consumer Groups',
    description: 'Group state, members and lag per partition.',
    icon: 'hugeicons:user-multiple',
    open: () =>
      openBrokerTab({
        id: tabId('kafka-groups'),
        name: 'Consumer Groups',
        type: TabViewType.KafkaConsumerGroupList,
        icon: 'hugeicons:user-multiple',
      }),
  },
  {
    id: 'live',
    title: 'Live Tail',
    description: 'Watch new messages arrive on a topic. Nothing is committed.',
    icon: 'hugeicons:live-streaming-01',
    open: () =>
      openBrokerTab({
        id: tabId('kafka-live'),
        name: 'Live Tail',
        type: TabViewType.KafkaLive,
        icon: 'hugeicons:live-streaming-01',
      }),
  },
];

const tools = computed(() => (isKafka.value ? kafkaTools : rabbitTools));
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-hidden">
    <ManagementSidebarHeader
      :title="isKafka ? 'Kafka Tools' : 'RabbitMQ Tools'"
      :show-connection="true"
      :workspace-id="workspaceId"
    />

    <div class="flex-1 overflow-y-auto px-3 pb-4">
      <div class="space-y-2 mt-2">
        <button
          v-for="tool in tools"
          :key="tool.id"
          type="button"
          class="w-full flex items-center gap-3 rounded-lg border bg-background p-3 text-left hover:bg-muted/20 transition-colors cursor-pointer"
          @click="tool.open"
        >
          <Button size="iconMd" variant="outline" as="span">
            <Icon :name="tool.icon" />
          </Button>
          <div class="flex-1">
            <p class="text-sm font-medium">{{ tool.title }}</p>
            <p class="text-xs text-muted-foreground">{{ tool.description }}</p>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
