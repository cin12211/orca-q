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
  formatNumber,
  useAutoRefresh,
  useBrokerRequest,
} from '~/components/modules/message-broker';
import type { Connection } from '~/core/stores';
import { useKafkaTabs } from '../hooks';
import { kafkaService } from '../services';

const props = defineProps<{ connection: Connection; groupId: string }>();

const { openTopic } = useKafkaTabs();
const group = useBrokerRequest(() =>
  kafkaService.group(props.connection, props.groupId)
);
useAutoRefresh(group.load);

const data = computed(() => group.data.value);
const topicCount = computed(
  () => new Set(data.value?.offsets.map(item => item.topic)).size
);
const isActive = computed(() => data.value?.state === 'Stable');

onMounted(() => group.load());
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3">
    <ToolPageHeader icon="hugeicons:user-multiple" :title="groupId">
      <template #context>
        <template v-if="data">
          <Badge variant="outline">{{ data.state }}</Badge>
          <Badge v-if="data.protocol" variant="outline">{{
            data.protocol
          }}</Badge>
        </template>
      </template>
      <template #actions>
        <Button
          size="xxs"
          variant="outline"
          :disabled="group.isLoading.value"
          @click="group.load()"
        >
          <Icon name="hugeicons:redo" class="size-3.5!" />
          Refresh
        </Button>
      </template>
    </ToolPageHeader>

    <BaseNotice v-if="group.error.value" variant="destructive">{{
      group.error.value
    }}</BaseNotice>
    <BaseNotice
      v-if="data && !isActive && data.totalLag > 0"
      variant="secondary"
    >
      No consumer is running in this group, so the lag will not go down.
    </BaseNotice>

    <div class="relative grid gap-3 md:grid-cols-3">
      <LoadingOverlay :visible="group.isLoading.value && !data" />
      <InsightKpiCard
        label="Total lag"
        :value="formatNumber(data?.totalLag)"
        :tone="(data?.totalLag ?? 0) > 0 ? 'warning' : 'success'"
        :show-badge="false"
        icon="hugeicons:hourglass"
      />
      <InsightKpiCard
        label="Members"
        :value="formatNumber(data?.members.length)"
        :show-badge="false"
        icon="hugeicons:user-multiple"
      />
      <InsightKpiCard
        label="Topics"
        :value="topicCount"
        :show-badge="false"
        icon="hugeicons:message-multiple-01"
      />
    </div>

    <section class="space-y-2">
      <h3
        class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        Lag by partition
      </h3>
      <div class="overflow-auto rounded-lg border">
        <Table class="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>Topic</TableHead>
              <TableHead>Partition</TableHead>
              <TableHead class="text-right">Committed</TableHead>
              <TableHead class="text-right">End offset</TableHead>
              <TableHead class="text-right">Lag</TableHead>
              <TableHead>Consumer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="item in data?.offsets ?? []"
              :key="`${item.topic}:${item.partition}`"
            >
              <TableCell>
                <button
                  type="button"
                  class="font-mono text-primary hover:underline cursor-pointer"
                  @click="openTopic(item.topic)"
                >
                  {{ item.topic }}
                </button>
              </TableCell>
              <TableCell class="tabular-nums">{{ item.partition }}</TableCell>
              <TableCell class="text-right tabular-nums">{{
                item.committedOffset
              }}</TableCell>
              <TableCell class="text-right tabular-nums">{{
                item.endOffset
              }}</TableCell>
              <TableCell
                class="text-right tabular-nums"
                :class="item.lag > 0 && 'text-amber-500'"
              >
                {{ formatNumber(item.lag) }}
              </TableCell>
              <TableCell class="font-mono">{{
                item.memberClientId ?? '-'
              }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>

    <section class="space-y-2">
      <h3
        class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        Members
      </h3>
      <p v-if="!data?.members.length" class="text-xs text-muted-foreground">
        No active members
      </p>
      <div v-else class="overflow-auto rounded-lg border">
        <Table class="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>Client id</TableHead>
              <TableHead>Host</TableHead>
              <TableHead>Assigned partitions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="member in data.members" :key="member.memberId">
              <TableCell class="font-mono">{{ member.clientId }}</TableCell>
              <TableCell class="font-mono">{{ member.clientHost }}</TableCell>
              <TableCell class="font-mono">
                {{
                  member.assignments
                    .map(
                      item => `${item.topic} [${item.partitions.join(', ')}]`
                    )
                    .join('; ') || '-'
                }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>
  </div>
</template>
