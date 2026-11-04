<script setup lang="ts">
import { useBrokerRequest } from '~/components/modules/shared/message-broker';
import type { Connection } from '~/core/stores';
import type {
  RabbitUserLimitName,
  RabbitVhostLimitName,
} from '~/core/types/rabbitmq.types';
import {
  RABBIT_USER_LIMIT_OPTIONS,
  RABBIT_VHOST_LIMIT_OPTIONS,
} from '../../constants';
import { useRabbitChange, useRabbitInsightsRefresh } from '../../hooks';
import { rabbitmqService } from '../../services';
import RabbitConfirmDialog from './RabbitConfirmDialog.vue';
import RabbitInsightsSectionTitle from './RabbitInsightsSectionTitle.vue';
import RabbitInsightsTable from './RabbitInsightsTable.vue';
import RabbitLimitDialog, {
  type RabbitLimitValue,
} from './RabbitLimitDialog.vue';

type LimitScope = 'vhost' | 'user';

interface PendingLimit {
  scope: LimitScope;
  target: string;
  name: string;
}

const props = defineProps<{
  connection: Connection;
  vhosts: string[];
  users: string[];
  canManage: boolean;
  refreshKey: number;
  intervalMs: number;
}>();

const emit = defineEmits<{ (e: 'open-user', userName: string): void }>();

const snapshot = useBrokerRequest(() =>
  rabbitmqService.limits(props.connection)
);
const { isSaving, run } = useRabbitChange(() => props.connection);
useRabbitInsightsRefresh(snapshot.load, {
  refreshKey: toRef(props, 'refreshKey'),
  intervalMs: toRef(props, 'intervalMs'),
});

const dialogScope = ref<LimitScope | null>(null);
const editing = ref<RabbitLimitValue | null>(null);
const clearing = ref<PendingLimit | null>(null);

const scopes = computed(() => [
  {
    scope: 'vhost' as const,
    title: 'Virtual host limits',
    targetLabel: 'Virtual host',
    targets: props.vhosts,
    options: RABBIT_VHOST_LIMIT_OPTIONS,
    rows: snapshot.data.value?.vhostLimits ?? [],
  },
  {
    scope: 'user' as const,
    title: 'User limits',
    targetLabel: 'User',
    targets: props.users,
    options: RABBIT_USER_LIMIT_OPTIONS,
    rows: snapshot.data.value?.userLimits ?? [],
  },
]);
const activeScope = computed(() =>
  scopes.value.find(item => item.scope === dialogScope.value)
);

const columnsFor = (scope: (typeof scopes.value)[number]) => [
  { key: 'target', label: scope.targetLabel },
  ...scope.options.map(option => ({
    key: option.name,
    label: option.name,
    title: option.description,
  })),
];

const rowsFor = (scope: (typeof scopes.value)[number]) =>
  scope.rows.map(row => ({ target: row.target, ...row.limits }));

const openDialog = (scope: LimitScope, initial: RabbitLimitValue | null) => {
  editing.value = initial;
  dialogScope.value = scope;
};

const save = async (value: RabbitLimitValue) => {
  const scope = dialogScope.value;
  const isSaved = await run('Limit saved', target =>
    scope === 'vhost'
      ? rabbitmqService.setVhostLimit(target, value.target, {
          name: value.name as RabbitVhostLimitName,
          value: value.value,
        })
      : rabbitmqService.setUserLimit(target, value.target, {
          name: value.name as RabbitUserLimitName,
          value: value.value,
        })
  );

  if (isSaved) {
    dialogScope.value = null;
    await snapshot.load();
  }
};

const confirmClear = async () => {
  const pending = clearing.value;
  if (!pending) return;

  const isCleared = await run('Limit cleared', target =>
    pending.scope === 'vhost'
      ? rabbitmqService.clearVhostLimit(
          target,
          pending.target,
          pending.name as RabbitVhostLimitName
        )
      : rabbitmqService.clearUserLimit(
          target,
          pending.target,
          pending.name as RabbitUserLimitName
        )
  );

  if (isCleared) {
    clearing.value = null;
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

    <section
      v-for="scope in scopes"
      :key="scope.scope"
      class="relative space-y-2"
    >
      <LoadingOverlay
        :visible="snapshot.isLoading.value && !snapshot.data.value"
      />
      <RabbitInsightsSectionTitle :title="scope.title">
        <Button
          v-if="canManage"
          size="xxs"
          variant="outline"
          @click="openDialog(scope.scope, null)"
        >
          <Icon name="hugeicons:add-01" class="size-3.5!" />
          Set limit
        </Button>
      </RabbitInsightsSectionTitle>
      <RabbitInsightsTable
        :columns="columnsFor(scope)"
        :rows="rowsFor(scope)"
        row-key="target"
        :empty-text="`No ${scope.title.toLowerCase()}.`"
      >
        <template #cell-target="{ row }">
          <button
            v-if="scope.scope === 'user'"
            type="button"
            class="underline-offset-2 hover:underline cursor-pointer"
            @click="emit('open-user', String(row.target))"
          >
            {{ row.target }}
          </button>
          <span v-else class="font-mono">{{ row.target }}</span>
        </template>
        <template
          v-for="option in scope.options"
          :key="option.name"
          #[`cell-${option.name}`]="{ row }"
        >
          <template v-if="row[option.name] === undefined">-</template>
          <span v-else class="inline-flex items-center gap-1">
            <span class="tabular-nums">{{ row[option.name] }}</span>
            <template v-if="canManage">
              <Button
                size="iconSm"
                variant="ghost"
                title="Edit limit"
                @click="
                  openDialog(scope.scope, {
                    target: String(row.target),
                    name: option.name,
                    value: Number(row[option.name]),
                  })
                "
              >
                <Icon name="hugeicons:pencil-edit-02" class="size-3.5!" />
              </Button>
              <Button
                size="iconSm"
                variant="ghost"
                title="Clear limit"
                @click="
                  clearing = {
                    scope: scope.scope,
                    target: String(row.target),
                    name: option.name,
                  }
                "
              >
                <Icon
                  name="hugeicons:delete-02"
                  class="size-3.5! text-destructive"
                />
              </Button>
            </template>
          </span>
        </template>
      </RabbitInsightsTable>
    </section>

    <RabbitLimitDialog
      v-if="activeScope"
      :open="Boolean(dialogScope)"
      :target-label="activeScope.targetLabel"
      :targets="activeScope.targets"
      :options="activeScope.options"
      :initial="editing"
      :is-saving="isSaving"
      @update:open="!$event && (dialogScope = null)"
      @save="save"
    />

    <RabbitConfirmDialog
      :open="Boolean(clearing)"
      :title="`Clear ${clearing?.name ?? ''} on ${clearing?.target ?? ''}?`"
      description="The cap is removed right away."
      confirm-label="Clear limit"
      is-destructive
      :is-saving="isSaving"
      @update:open="!$event && (clearing = null)"
      @confirm="confirmClear"
    />
  </div>
</template>
