<script setup lang="ts">
import { useBrokerRequest } from '~/components/modules/shared/message-broker';
import type { Connection } from '~/core/stores';
import type {
  RabbitPolicy,
  RabbitPolicyKind,
} from '~/core/types/rabbitmq.types';
import { useRabbitChange, useRabbitInsightsRefresh } from '../../hooks';
import { rabbitmqService } from '../../services';
import RabbitConfirmDialog from './RabbitConfirmDialog.vue';
import RabbitInsightsSectionTitle from './RabbitInsightsSectionTitle.vue';
import RabbitInsightsTable from './RabbitInsightsTable.vue';
import RabbitPolicyDialog from './RabbitPolicyDialog.vue';

const props = defineProps<{
  connection: Connection;
  vhosts: string[];
  /** Kinds the connected user may write: policymaker → user, admin → both. */
  allowedKinds: RabbitPolicyKind[];
  refreshKey: number;
  intervalMs: number;
}>();

const snapshot = useBrokerRequest(() =>
  rabbitmqService.policies(props.connection)
);
const { isSaving, run } = useRabbitChange(() => props.connection);
useRabbitInsightsRefresh(snapshot.load, {
  refreshKey: toRef(props, 'refreshKey'),
  intervalMs: toRef(props, 'intervalMs'),
});

const isDialogOpen = ref(false);
const editing = ref<RabbitPolicy | null>(null);
const addKind = ref<RabbitPolicyKind>('user');
const deleting = ref<RabbitPolicy | null>(null);

const columns = [
  { key: 'vhost', label: 'Virtual host' },
  { key: 'name', label: 'Name' },
  { key: 'pattern', label: 'Pattern' },
  { key: 'applyTo', label: 'Apply to' },
  { key: 'definition', label: 'Definition' },
  { key: 'priority', label: 'Priority' },
  { key: 'actions', label: '', class: 'w-20 text-right' },
];

const groups = computed(() =>
  (['user', 'operator'] as const).map(kind => ({
    kind,
    title: kind === 'user' ? 'User policies' : 'Operator policies',
    rows: (snapshot.data.value?.policies ?? [])
      .filter(policy => policy.kind === kind)
      .map(policy => ({ ...policy, key: `${policy.vhost}/${policy.name}` })),
  }))
);
const asPolicy = (row: Record<string, unknown>) =>
  row as unknown as RabbitPolicy;
const canWrite = (kind: RabbitPolicyKind) => props.allowedKinds.includes(kind);

const openDialog = (policy: RabbitPolicy | null, kind?: RabbitPolicyKind) => {
  editing.value = policy;
  addKind.value = kind ?? policy?.kind ?? 'user';
  isDialogOpen.value = true;
};

const save = async (value: { policy: RabbitPolicy; previousName?: string }) => {
  const isSaved = await run(`Policy "${value.policy.name}" saved`, target =>
    rabbitmqService.savePolicy(target, value.policy, value.previousName)
  );

  if (isSaved) {
    isDialogOpen.value = false;
    await snapshot.load();
  }
};

const confirmDelete = async () => {
  const policy = deleting.value;
  if (!policy) return;

  const isDeleted = await run(`Policy "${policy.name}" deleted`, target =>
    rabbitmqService.deletePolicy(target, {
      kind: policy.kind,
      vhost: policy.vhost,
      name: policy.name,
    })
  );

  if (isDeleted) {
    deleting.value = null;
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
    <BaseNotice
      v-else-if="snapshot.data.value?.unavailableReason"
      variant="secondary"
    >
      {{ snapshot.data.value.unavailableReason }}
    </BaseNotice>

    <section
      v-for="group in groups"
      :key="group.kind"
      class="relative space-y-2"
    >
      <LoadingOverlay
        :visible="snapshot.isLoading.value && !snapshot.data.value"
      />
      <RabbitInsightsSectionTitle :title="group.title">
        <Button
          v-if="canWrite(group.kind)"
          size="xxs"
          variant="outline"
          @click="openDialog(null, group.kind)"
        >
          <Icon name="hugeicons:add-01" class="size-3.5!" />
          Add policy
        </Button>
      </RabbitInsightsSectionTitle>
      <RabbitInsightsTable
        :columns="columns"
        :rows="group.rows"
        row-key="key"
        :empty-text="`No ${group.title.toLowerCase()}.`"
      >
        <template #cell-pattern="{ row }">
          <span class="font-mono">{{ asPolicy(row).pattern }}</span>
        </template>
        <template #cell-definition="{ row }">
          <div class="flex flex-wrap gap-1">
            <Badge
              v-for="(value, key) in asPolicy(row).definition"
              :key="key"
              variant="outline"
              class="font-mono"
            >
              {{ key }}: {{ value }}
            </Badge>
          </div>
        </template>
        <template #cell-actions="{ row }">
          <div
            v-if="canWrite(asPolicy(row).kind)"
            class="flex justify-end gap-1"
          >
            <Button
              size="iconSm"
              variant="ghost"
              title="Edit policy"
              @click="openDialog(asPolicy(row))"
            >
              <Icon name="hugeicons:pencil-edit-02" class="size-3.5!" />
            </Button>
            <Button
              size="iconSm"
              variant="ghost"
              title="Delete policy"
              @click="deleting = asPolicy(row)"
            >
              <Icon
                name="hugeicons:delete-02"
                class="size-3.5! text-destructive"
              />
            </Button>
          </div>
        </template>
      </RabbitInsightsTable>
    </section>

    <RabbitPolicyDialog
      v-model:open="isDialogOpen"
      :vhosts="vhosts"
      :policy="editing"
      :allowed-kinds="allowedKinds"
      :initial-kind="addKind"
      :is-saving="isSaving"
      @save="save"
    />

    <RabbitConfirmDialog
      :open="Boolean(deleting)"
      :title="`Delete policy ${deleting?.name ?? ''}?`"
      :description="`Queues and exchanges matching ${deleting?.pattern ?? ''} on ${deleting?.vhost ?? ''} lose these settings.`"
      confirm-label="Delete policy"
      is-destructive
      :is-saving="isSaving"
      @update:open="!$event && (deleting = null)"
      @confirm="confirmDelete"
    />
  </div>
</template>
