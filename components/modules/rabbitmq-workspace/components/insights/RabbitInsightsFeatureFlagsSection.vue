<script setup lang="ts">
import { useBrokerRequest } from '~/components/modules/shared/message-broker';
import type { Connection } from '~/core/stores';
import type {
  RabbitDeprecatedFeature,
  RabbitFeatureFlag,
} from '~/core/types/rabbitmq.types';
import { useRabbitChange, useRabbitInsightsRefresh } from '../../hooks';
import { rabbitmqService } from '../../services';
import RabbitConfirmDialog from './RabbitConfirmDialog.vue';
import RabbitInsightsSectionTitle from './RabbitInsightsSectionTitle.vue';
import RabbitInsightsTable from './RabbitInsightsTable.vue';

const ENABLED_STATE = 'enabled';
const EXPERIMENTAL = 'experimental';

const props = defineProps<{
  connection: Connection;
  canManage: boolean;
  refreshKey: number;
  intervalMs: number;
}>();

const snapshot = useBrokerRequest(() =>
  rabbitmqService.featureFlags(props.connection)
);
const { isSaving, run } = useRabbitChange(() => props.connection);
useRabbitInsightsRefresh(snapshot.load, {
  refreshKey: toRef(props, 'refreshKey'),
  intervalMs: toRef(props, 'intervalMs'),
});

const enabling = ref<RabbitFeatureFlag | null>(null);
const showOnlyUsed = ref(false);

const flagColumns = [
  { key: 'name', label: 'Name' },
  { key: 'state', label: 'State' },
  { key: 'stability', label: 'Stability' },
  { key: 'description', label: 'Description' },
  { key: 'actions', label: '', class: 'w-24 text-right' },
];
const deprecatedColumns = [
  { key: 'name', label: 'Name' },
  { key: 'phase', label: 'Phase' },
  { key: 'used', label: 'In use' },
  { key: 'description', label: 'Description' },
];

const flags = computed(() =>
  (snapshot.data.value?.flags ?? []).map(flag => ({ ...flag }))
);
const disabledCount = computed(
  () => flags.value.filter(flag => flag.state !== ENABLED_STATE).length
);
const deprecated = computed(() =>
  (snapshot.data.value?.deprecated ?? [])
    .filter(feature => !showOnlyUsed.value || feature.isUsed)
    .map(feature => ({ ...feature }))
);
const asFlag = (row: Record<string, unknown>) =>
  row as unknown as RabbitFeatureFlag;
const asDeprecated = (row: Record<string, unknown>) =>
  row as unknown as RabbitDeprecatedFeature;

const confirmEnable = async () => {
  const flag = enabling.value;
  if (!flag) return;

  const isEnabled = await run(`Feature flag "${flag.name}" enabled`, target =>
    rabbitmqService.enableFeatureFlag(target, flag.name)
  );

  if (isEnabled) {
    enabling.value = null;
    await snapshot.load();
  }
};

onMounted(() => snapshot.load());
</script>

<template>
  <div class="space-y-4">
    <BaseNotice v-if="snapshot.error.value" variant="destructive">
      {{ snapshot.error.value }}
    </BaseNotice>
    <BaseNotice v-else-if="disabledCount" variant="secondary">
      {{ disabledCount }} feature flag(s) are not enabled. Enable stable flags
      before upgrading RabbitMQ, or the upgrade may refuse to start.
    </BaseNotice>

    <section class="relative space-y-2">
      <LoadingOverlay
        :visible="snapshot.isLoading.value && !snapshot.data.value"
      />
      <RabbitInsightsSectionTitle :title="`Feature flags (${flags.length})`" />
      <RabbitInsightsTable
        :columns="flagColumns"
        :rows="flags"
        row-key="name"
        empty-text="No feature flags reported."
      >
        <template #cell-name="{ row }">
          <a
            v-if="asFlag(row).docUrl"
            :href="asFlag(row).docUrl ?? undefined"
            target="_blank"
            rel="noopener"
            class="font-mono underline-offset-2 hover:underline"
          >
            {{ asFlag(row).name }}
          </a>
          <span v-else class="font-mono">{{ asFlag(row).name }}</span>
        </template>
        <template #cell-state="{ row }">
          <span
            :class="
              asFlag(row).state === ENABLED_STATE
                ? 'text-emerald-500'
                : 'text-amber-500'
            "
          >
            {{ asFlag(row).state }}
          </span>
        </template>
        <template #cell-stability="{ row }">
          <Badge variant="outline">{{ asFlag(row).stability }}</Badge>
        </template>
        <template #cell-actions="{ row }">
          <Button
            v-if="canManage && asFlag(row).state !== ENABLED_STATE"
            size="xxs"
            variant="outline"
            @click="enabling = asFlag(row)"
          >
            Enable
          </Button>
        </template>
      </RabbitInsightsTable>
    </section>

    <section class="space-y-2">
      <RabbitInsightsSectionTitle title="Deprecated features">
        <label class="flex items-center gap-2 text-xs cursor-pointer">
          <Switch
            id="rabbit-deprecated-used"
            v-model:model-value="showOnlyUsed"
          />
          Only in use
        </label>
      </RabbitInsightsSectionTitle>
      <RabbitInsightsTable
        :columns="deprecatedColumns"
        :rows="deprecated"
        row-key="name"
        :empty-text="
          showOnlyUsed
            ? 'No deprecated feature is in use.'
            : 'No deprecated features reported.'
        "
      >
        <template #cell-name="{ row }">
          <span class="font-mono">{{ asDeprecated(row).name }}</span>
        </template>
        <template #cell-phase="{ row }">
          <Badge variant="outline">{{ asDeprecated(row).phase }}</Badge>
        </template>
        <template #cell-used="{ row }">
          <span :class="asDeprecated(row).isUsed && 'text-amber-500'">
            {{ asDeprecated(row).isUsed ? 'Yes' : 'No' }}
          </span>
        </template>
      </RabbitInsightsTable>
    </section>

    <RabbitConfirmDialog
      :open="Boolean(enabling)"
      :title="`Enable ${enabling?.name ?? ''}?`"
      :description="
        enabling?.stability === EXPERIMENTAL
          ? 'This flag is experimental and may be unsupported. Enabled feature flags cannot be disabled again.'
          : 'Enabled feature flags cannot be disabled again. Every node in the cluster must support it.'
      "
      confirm-label="Enable"
      :confirm-text="
        enabling?.stability === EXPERIMENTAL ? enabling.name : undefined
      "
      :is-saving="isSaving"
      @update:open="!$event && (enabling = null)"
      @confirm="confirmEnable"
    />
  </div>
</template>
