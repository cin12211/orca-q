<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import InsightKpiCard from '~/components/modules/instance-insights/components/InsightKpiCard.vue';
import {
  formatBytes,
  formatNumber,
  useBrokerRequest,
} from '~/components/modules/shared/message-broker';
import type { Connection } from '~/core/stores';
import { useKafkaTabs } from '../hooks';
import { kafkaService } from '../services';
import KafkaProduceDialog from './KafkaProduceDialog.vue';
import KafkaTopicMessages from './KafkaTopicMessages.vue';

const props = defineProps<{ connection: Connection; topicName: string }>();

const { openGroup } = useKafkaTabs();
const topic = useBrokerRequest(() =>
  kafkaService.topic(props.connection, props.topicName)
);
const activeTab = ref('messages');
const isProduceOpen = ref(false);
const isOnlyOverrides = ref(true);

const data = computed(() => topic.data.value);
const partitionCount = computed(() => data.value?.partitions.length ?? 0);
const totals = computed(() => {
  const partitions = data.value?.partitions ?? [];
  return {
    messages: partitions.reduce((sum, item) => sum + item.messageCount, 0),
    size: partitions.some(item => item.sizeBytes === null)
      ? null
      : partitions.reduce((sum, item) => sum + (item.sizeBytes ?? 0), 0),
    underReplicated: partitions.filter(
      item => item.isr.length < item.replicas.length
    ).length,
    replication: partitions[0]?.replicas.length ?? 0,
  };
});
const visibleConfigs = computed(() =>
  (data.value?.configs ?? []).filter(
    config => !isOnlyOverrides.value || !config.isDefault
  )
);
const totalLag = computed(() =>
  (data.value?.consumerGroups ?? []).reduce((sum, group) => sum + group.lag, 0)
);

onMounted(() => topic.load());
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-3">
    <ToolPageHeader icon="hugeicons:message-multiple-01" :title="topicName">
      <template #actions>
        <Button
          size="xxs"
          variant="outline"
          :disabled="!partitionCount"
          @click="isProduceOpen = true"
        >
          <Icon name="hugeicons:sent" class="size-3.5!" />
          Produce
        </Button>
        <Button
          size="xxs"
          variant="outline"
          :disabled="topic.isLoading.value"
          @click="topic.load()"
        >
          <Icon name="hugeicons:redo" class="size-3.5!" />
          Refresh
        </Button>
      </template>
    </ToolPageHeader>

    <BaseNotice v-if="topic.error.value" variant="destructive">{{
      topic.error.value
    }}</BaseNotice>

    <div class="relative grid shrink-0 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <LoadingOverlay :visible="topic.isLoading.value && !data" />
      <InsightKpiCard
        label="Partitions"
        :value="partitionCount"
        :subtext="`Replication ${totals.replication}`"
        :show-badge="false"
        icon="hugeicons:layers-01"
      />
      <InsightKpiCard
        label="Messages"
        :value="formatNumber(totals.messages)"
        :show-badge="false"
        icon="hugeicons:message-multiple-01"
      />
      <InsightKpiCard
        label="Size"
        :value="totals.size === null ? '-' : formatBytes(totals.size)"
        :show-badge="false"
        icon="hugeicons:hard-drive"
      />
      <InsightKpiCard
        label="Under-replicated"
        :value="totals.underReplicated"
        :tone="totals.underReplicated ? 'warning' : 'success'"
        :show-badge="false"
        icon="hugeicons:copy-01"
      />
      <InsightKpiCard
        label="Consumer lag"
        :value="formatNumber(totalLag)"
        :subtext="`${data?.consumerGroups.length ?? 0} groups`"
        :tone="totalLag ? 'warning' : 'default'"
        :show-badge="false"
        icon="hugeicons:user-multiple"
      />
    </div>

    <Tabs
      v-model="activeTab"
      class="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden"
    >
      <TabsList size="sm" class="justify-start! shrink-0">
        <TabsTrigger size="xs" value="messages" class="cursor-pointer"
          >Messages</TabsTrigger
        >
        <TabsTrigger size="xs" value="partitions" class="cursor-pointer"
          >Partitions</TabsTrigger
        >
        <TabsTrigger size="xs" value="consumers" class="cursor-pointer"
          >Consumers</TabsTrigger
        >
        <TabsTrigger size="xs" value="config" class="cursor-pointer"
          >Config</TabsTrigger
        >
      </TabsList>

      <TabsContent
        value="messages"
        class="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
      >
        <KafkaTopicMessages
          v-if="partitionCount"
          :connection="connection"
          :topic-name="topicName"
          :partition-count="partitionCount"
        />
      </TabsContent>

      <TabsContent
        value="partitions"
        class="mt-0 min-h-0 flex-1 overflow-auto data-[state=inactive]:hidden"
      >
        <div class="overflow-auto rounded-lg border">
          <Table class="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>Partition</TableHead>
                <TableHead>Leader</TableHead>
                <TableHead>Replicas</TableHead>
                <TableHead>In sync</TableHead>
                <TableHead class="text-right">Start offset</TableHead>
                <TableHead class="text-right">End offset</TableHead>
                <TableHead class="text-right">Messages</TableHead>
                <TableHead class="text-right">Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="item in data?.partitions ?? []"
                :key="item.partition"
              >
                <TableCell class="tabular-nums">{{ item.partition }}</TableCell>
                <TableCell :class="item.leader < 0 && 'text-rose-500'">
                  {{ item.leader < 0 ? 'None' : item.leader }}
                </TableCell>
                <TableCell>{{ item.replicas.join(', ') }}</TableCell>
                <TableCell
                  :class="
                    item.isr.length < item.replicas.length && 'text-amber-500'
                  "
                >
                  {{ item.isr.join(', ') }}
                </TableCell>
                <TableCell class="text-right tabular-nums">{{
                  item.startOffset
                }}</TableCell>
                <TableCell class="text-right tabular-nums">{{
                  item.endOffset
                }}</TableCell>
                <TableCell class="text-right tabular-nums">{{
                  formatNumber(item.messageCount)
                }}</TableCell>
                <TableCell class="text-right tabular-nums">
                  {{
                    item.sizeBytes === null ? '-' : formatBytes(item.sizeBytes)
                  }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent
        value="consumers"
        class="mt-0 min-h-0 flex-1 overflow-auto data-[state=inactive]:hidden"
      >
        <p
          v-if="!data?.consumerGroups.length"
          class="text-xs text-muted-foreground"
        >
          No consumer group has committed offsets for this topic.
        </p>
        <div v-else class="overflow-auto rounded-lg border">
          <Table class="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead>State</TableHead>
                <TableHead class="text-right">Lag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="group in data.consumerGroups"
                :key="group.groupId"
                class="cursor-pointer"
                @click="openGroup(group.groupId)"
              >
                <TableCell class="font-mono">{{ group.groupId }}</TableCell>
                <TableCell>{{ group.state }}</TableCell>
                <TableCell
                  class="text-right tabular-nums"
                  :class="group.lag > 0 && 'text-amber-500'"
                >
                  {{ formatNumber(group.lag) }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent
        value="config"
        class="mt-0 min-h-0 flex-1 overflow-auto space-y-2 data-[state=inactive]:hidden"
      >
        <div class="flex items-center gap-2 text-xs">
          <Switch
            id="kafka-config-overrides"
            v-model:model-value="isOnlyOverrides"
          />
          <label for="kafka-config-overrides" class="cursor-pointer"
            >Only values that differ from the default</label
          >
        </div>
        <p v-if="!visibleConfigs.length" class="text-xs text-muted-foreground">
          This topic uses the broker defaults.
        </p>
        <div v-else class="overflow-auto rounded-lg border">
          <Table class="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="config in visibleConfigs" :key="config.name">
                <TableCell class="font-mono">{{ config.name }}</TableCell>
                <TableCell class="font-mono break-all">
                  {{ config.isSensitive ? '(hidden)' : (config.value ?? '-') }}
                </TableCell>
                <TableCell>{{
                  config.isDefault ? 'Default' : 'Override'
                }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>

    <KafkaProduceDialog
      v-model:open="isProduceOpen"
      :connection="connection"
      :topic-name="topicName"
      :partition-count="partitionCount"
    />
  </div>
</template>
