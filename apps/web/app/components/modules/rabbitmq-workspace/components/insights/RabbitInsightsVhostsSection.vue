<script setup lang="ts">
import {
  formatBytes,
  formatMessageRate,
  formatNumber,
  useBrokerRequest,
} from '~/components/modules/shared/message-broker';
import type { Connection } from '~/core/stores';
import type {
  RabbitVhostInput,
  RabbitVhostSummary,
} from '~/core/types/rabbitmq.types';
import { useRabbitChange, useRabbitInsightsRefresh } from '../../hooks';
import { rabbitmqService } from '../../services';
import RabbitConfirmDialog from './RabbitConfirmDialog.vue';
import RabbitInsightsSectionTitle from './RabbitInsightsSectionTitle.vue';
import RabbitInsightsTable from './RabbitInsightsTable.vue';
import RabbitVhostDialog from './RabbitVhostDialog.vue';

const props = defineProps<{
  connection: Connection;
  canManage: boolean;
  refreshKey: number;
  intervalMs: number;
}>();

const emit = defineEmits<{ (e: 'open-queues', vhost: string): void }>();

const vhosts = useBrokerRequest(() =>
  rabbitmqService.vhostDetails(props.connection)
);
const { isSaving, run } = useRabbitChange(() => props.connection);
useRabbitInsightsRefresh(vhosts.load, {
  refreshKey: toRef(props, 'refreshKey'),
  intervalMs: toRef(props, 'intervalMs'),
});

const isDialogOpen = ref(false);
const editing = ref<RabbitVhostSummary | null>(null);
const deleting = ref<string | null>(null);

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'state', label: 'State' },
  { key: 'queueType', label: 'Default queue type' },
  { key: 'tags', label: 'Tags' },
  { key: 'messages', label: 'Ready / Unacked / Total' },
  { key: 'rates', label: 'Publish / Deliver' },
  { key: 'network', label: 'From / to client' },
  { key: 'actions', label: '', class: 'w-24 text-right' },
];

const rows = computed(() =>
  (vhosts.data.value ?? []).map(item => ({ ...item }))
);
const asVhost = (row: Record<string, unknown>) =>
  row as unknown as RabbitVhostSummary;
const stateOf = (vhost: RabbitVhostSummary) => {
  const states = [...new Set(Object.values(vhost.clusterState))];
  return states.length ? states.join(', ') : '-';
};
const rate = (value: number | null) =>
  value === null ? '-' : `${formatBytes(value)}/s`;

const openDialog = (vhost: RabbitVhostSummary | null) => {
  editing.value = vhost;
  isDialogOpen.value = true;
};

const save = async (input: RabbitVhostInput) => {
  const isNew = !editing.value;
  const isSaved = await run(
    isNew ? `Virtual host "${input.name}" added` : 'Virtual host saved',
    target => rabbitmqService.saveVhost(target, input, isNew)
  );

  if (isSaved) {
    isDialogOpen.value = false;
    await vhosts.load();
  }
};

const confirmDelete = async () => {
  const name = deleting.value;
  if (!name) return;

  const isDeleted = await run(`Virtual host "${name}" deleted`, target =>
    rabbitmqService.deleteVhost(target, name)
  );

  if (isDeleted) {
    deleting.value = null;
    await vhosts.load();
  }
};

onMounted(() => vhosts.load());
</script>

<template>
  <div class="space-y-3">
    <RabbitInsightsSectionTitle title="Virtual hosts">
      <Button
        v-if="canManage"
        size="xxs"
        variant="outline"
        @click="openDialog(null)"
      >
        <Icon name="hugeicons:add-01" class="size-3.5!" />
        Add virtual host
      </Button>
    </RabbitInsightsSectionTitle>

    <BaseNotice v-if="vhosts.error.value" variant="destructive">
      {{ vhosts.error.value }}
    </BaseNotice>
    <div class="relative">
      <LoadingOverlay :visible="vhosts.isLoading.value && !vhosts.data.value" />
      <RabbitInsightsTable
        :columns="columns"
        :rows="rows"
        row-key="name"
        empty-text="No virtual hosts visible to this user."
      >
        <template #cell-name="{ row }">
          <button
            type="button"
            class="font-mono underline-offset-2 hover:underline cursor-pointer"
            title="Open queues"
            @click="emit('open-queues', asVhost(row).name)"
          >
            {{ asVhost(row).name }}
          </button>
          <div
            v-if="asVhost(row).description"
            class="text-muted-foreground max-w-56 truncate"
          >
            {{ asVhost(row).description }}
          </div>
        </template>
        <template #cell-state="{ row }">
          {{ stateOf(asVhost(row)) }}
          <Badge v-if="asVhost(row).isTracing" variant="outline">tracing</Badge>
          <Badge v-if="asVhost(row).isProtectedFromDeletion" variant="outline">
            protected
          </Badge>
        </template>
        <template #cell-queueType="{ row }">
          {{ asVhost(row).defaultQueueType }}
        </template>
        <template #cell-tags="{ row }">
          {{ asVhost(row).tags.join(', ') || '-' }}
        </template>
        <template #cell-messages="{ row }">
          {{ formatNumber(asVhost(row).messagesReady) }} /
          {{ formatNumber(asVhost(row).messagesUnacknowledged) }} /
          {{ formatNumber(asVhost(row).messages) }}
        </template>
        <template #cell-rates="{ row }">
          {{ formatMessageRate(asVhost(row).rates.publish) }} /
          {{ formatMessageRate(asVhost(row).rates.deliver) }}
        </template>
        <template #cell-network="{ row }">
          {{ rate(asVhost(row).receiveRate) }} /
          {{ rate(asVhost(row).sendRate) }}
        </template>
        <template #cell-actions="{ row }">
          <div v-if="canManage" class="flex justify-end gap-1">
            <Button
              size="iconSm"
              variant="ghost"
              title="Edit virtual host"
              @click="openDialog(asVhost(row))"
            >
              <Icon name="hugeicons:pencil-edit-02" class="size-3.5!" />
            </Button>
            <Button
              size="iconSm"
              variant="ghost"
              :disabled="asVhost(row).isProtectedFromDeletion"
              :title="
                asVhost(row).isProtectedFromDeletion
                  ? 'Deletion protection is on'
                  : 'Delete virtual host'
              "
              @click="deleting = asVhost(row).name"
            >
              <Icon
                name="hugeicons:delete-02"
                class="size-3.5! text-destructive"
              />
            </Button>
          </div>
        </template>
      </RabbitInsightsTable>
    </div>

    <RabbitVhostDialog
      v-model:open="isDialogOpen"
      :vhost="editing"
      :is-saving="isSaving"
      @save="save"
    />

    <RabbitConfirmDialog
      :open="Boolean(deleting)"
      :title="`Delete virtual host ${deleting ?? ''}?`"
      description="Every queue, exchange, binding, policy and message in it is deleted for good."
      confirm-label="Delete virtual host"
      :confirm-text="deleting ?? undefined"
      is-destructive
      :is-saving="isSaving"
      @update:open="!$event && (deleting = null)"
      @confirm="confirmDelete"
    />
  </div>
</template>
