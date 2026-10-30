<script setup lang="ts">
import { useBrokerRequest } from '~/components/modules/shared/message-broker';
import type { Connection } from '~/core/stores';
import type { RabbitPolicyKind } from '~/core/types/rabbitmq.types';
import {
  RabbitConfirmDialog,
  RabbitInsightsChannelsSection,
  RabbitInsightsConnectionsSection,
  RabbitInsightsFeatureFlagsSection,
  RabbitInsightsLimitsSection,
  RabbitInsightsNodesSection,
  RabbitInsightsOverviewSection,
  RabbitInsightsPoliciesSection,
  RabbitInsightsPortsSection,
  RabbitInsightsVhostsSection,
} from '../components/insights';
import {
  RABBIT_ADMINISTRATOR_TAG,
  RABBIT_DEFAULT_REFRESH_MS,
  RABBIT_INSIGHTS_SECTIONS,
  RABBIT_REFRESH_OPTIONS,
  type RabbitInsightsSectionId,
} from '../constants';
import {
  useRabbitChange,
  useRabbitInsightsRefresh,
  useRabbitTabs,
} from '../hooks';
import { rabbitmqService } from '../services';

const POLICYMAKER_TAG = 'policymaker';

const props = defineProps<{ connection: Connection }>();

const { openQueueList, openUser } = useRabbitTabs();
const overview = useBrokerRequest(() =>
  rabbitmqService.overview(props.connection)
);
const users = useBrokerRequest(() => rabbitmqService.users(props.connection));
const { isSaving, run } = useRabbitChange(() => props.connection);

const activeSection = ref<RabbitInsightsSectionId>('overview');
const intervalMs = ref<number>(RABBIT_DEFAULT_REFRESH_MS);
const refreshKey = ref(0);
const isRenameOpen = ref(false);
const clusterName = ref('');

useRabbitInsightsRefresh(overview.load, { refreshKey, intervalMs });

const data = computed(() => overview.data.value);
const currentTags = computed(() => data.value?.currentUser.tags ?? []);
const canManage = computed(() =>
  currentTags.value.includes(RABBIT_ADMINISTRATOR_TAG)
);
const policyKinds = computed<RabbitPolicyKind[]>(() =>
  canManage.value
    ? ['user', 'operator']
    : currentTags.value.includes(POLICYMAKER_TAG)
      ? ['user']
      : []
);
const userNames = computed(() =>
  (users.data.value?.users ?? []).map(user => user.name)
);
const intervalText = computed({
  get: () => String(intervalMs.value),
  set: value => {
    intervalMs.value = Number(value);
  },
});

const openRename = () => {
  clusterName.value = data.value?.clusterName ?? '';
  isRenameOpen.value = true;
};

const confirmRename = async () => {
  const name = clusterName.value.trim();
  if (!name) return;

  const isRenamed = await run('Cluster renamed', target =>
    rabbitmqService.renameCluster(target, name)
  );

  if (isRenamed) {
    isRenameOpen.value = false;
    await overview.load();
  }
};

const openUserTab = (userName: string) => void openUser(userName);

watch(canManage, value => {
  if (value && !users.data.value) void users.load();
});

onMounted(() => overview.load());
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-3">
    <ToolPageHeader
      icon="hugeicons:activity-02"
      title="RabbitMQ Instance Insights"
      :description="
        data
          ? `RabbitMQ ${data.version} · Erlang ${data.erlangVersion} · ${data.clusterName}`
          : 'Broker health, clients, virtual hosts, policies and limits'
      "
    >
      <template #actions>
        <div class="flex items-center gap-2 text-xs">
          <Label for="rabbit-insights-interval" class="text-xs">
            Auto refresh
          </Label>
          <Select v-model="intervalText">
            <SelectTrigger
              id="rabbit-insights-interval"
              size="sm"
              class="h-7 w-20"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in RABBIT_REFRESH_OPTIONS"
                :key="option.value"
                :value="String(option.value)"
              >
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          size="xxs"
          variant="outline"
          :disabled="overview.isLoading.value"
          @click="refreshKey++"
        >
          <Icon name="hugeicons:redo" class="size-3.5!" />
          Refresh
        </Button>
      </template>
    </ToolPageHeader>

    <BaseNotice v-if="overview.error.value" variant="destructive">
      {{ overview.error.value }}
    </BaseNotice>
    <BaseNotice
      v-for="node in (data?.nodes ?? []).filter(
        item => item.hasMemoryAlarm || item.hasDiskAlarm
      )"
      :key="node.name"
      variant="destructive"
    >
      Node {{ node.name }} has a
      {{ node.hasMemoryAlarm ? 'memory' : 'disk' }} alarm. Publishers are
      blocked until it clears.
    </BaseNotice>

    <Tabs
      v-model="activeSection"
      class="flex flex-1 min-h-0 flex-col gap-2 overflow-hidden"
    >
      <TabsList
        size="sm"
        class="max-w-full justify-start! shrink-0 overflow-x-auto"
      >
        <TabsTrigger
          v-for="section in RABBIT_INSIGHTS_SECTIONS"
          :key="section.id"
          size="xs"
          :value="section.id"
          class="min-w-fit shrink-0 cursor-pointer rounded-sm"
        >
          {{ section.label }}
        </TabsTrigger>
      </TabsList>

      <div
        class="relative flex-1 min-h-0 overflow-y-auto rounded-lg border bg-background p-3"
      >
        <LoadingOverlay :visible="overview.isLoading.value && !data" />

        <TabsContent value="overview" class="mt-0">
          <RabbitInsightsOverviewSection
            :overview="data"
            :can-manage="canManage"
            @open-queues="openQueueList"
            @open-section="activeSection = $event"
            @rename-cluster="openRename"
          />
        </TabsContent>
        <TabsContent value="nodes" class="mt-0">
          <RabbitInsightsNodesSection :overview="data" />
        </TabsContent>
        <TabsContent value="connections" class="mt-0">
          <RabbitInsightsConnectionsSection
            :connection="connection"
            :can-manage="canManage"
            :refresh-key="refreshKey"
            :interval-ms="intervalMs"
          />
        </TabsContent>
        <TabsContent value="channels" class="mt-0">
          <RabbitInsightsChannelsSection
            :connection="connection"
            :refresh-key="refreshKey"
            :interval-ms="intervalMs"
          />
        </TabsContent>
        <TabsContent value="vhosts" class="mt-0">
          <RabbitInsightsVhostsSection
            :connection="connection"
            :can-manage="canManage"
            :refresh-key="refreshKey"
            :interval-ms="intervalMs"
            @open-queues="openQueueList"
          />
        </TabsContent>
        <TabsContent value="policies" class="mt-0">
          <RabbitInsightsPoliciesSection
            :connection="connection"
            :vhosts="data?.vhosts ?? []"
            :allowed-kinds="policyKinds"
            :refresh-key="refreshKey"
            :interval-ms="intervalMs"
          />
        </TabsContent>
        <TabsContent value="limits" class="mt-0">
          <RabbitInsightsLimitsSection
            :connection="connection"
            :vhosts="data?.vhosts ?? []"
            :users="userNames"
            :can-manage="canManage"
            :refresh-key="refreshKey"
            :interval-ms="intervalMs"
            @open-user="openUserTab"
          />
        </TabsContent>
        <TabsContent value="feature-flags" class="mt-0">
          <RabbitInsightsFeatureFlagsSection
            :connection="connection"
            :can-manage="canManage"
            :refresh-key="refreshKey"
            :interval-ms="intervalMs"
          />
        </TabsContent>
        <TabsContent value="ports" class="mt-0">
          <RabbitInsightsPortsSection :overview="data" />
        </TabsContent>
      </div>
    </Tabs>

    <RabbitConfirmDialog
      v-model:open="isRenameOpen"
      title="Rename cluster"
      description="The cluster name shows in the Management UI and in client connection properties. Clients do not need to reconnect."
      confirm-label="Rename"
      :is-saving="isSaving"
      @confirm="confirmRename"
    >
      <div class="space-y-1.5">
        <Label for="rabbit-cluster-name" class="text-xs">Cluster name</Label>
        <Input id="rabbit-cluster-name" v-model="clusterName" />
      </div>
    </RabbitConfirmDialog>
  </div>
</template>
