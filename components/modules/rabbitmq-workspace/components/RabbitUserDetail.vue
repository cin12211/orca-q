<script setup lang="ts">
import { useBrokerRequest } from '~/components/modules/shared/message-broker';
import type { Connection } from '~/core/stores';
import type {
  RabbitTopicPermission,
  RabbitUserLimitName,
  RabbitUserPermission,
} from '~/core/types/rabbitmq.types';
import {
  RABBIT_ADMINISTRATOR_TAG,
  RABBIT_TAB_ICONS,
  RABBIT_USER_TAG_DESCRIPTIONS,
} from '../constants';
import { useRabbitUserActions, useRabbitUsersChanged } from '../hooks';
import { rabbitmqService } from '../services';
import { getRabbitUserAppearance } from '../utils';
import RabbitDeleteUserDialog from './RabbitDeleteUserDialog.vue';
import RabbitEditUserDialog from './RabbitEditUserDialog.vue';
import RabbitPermissionDialog from './RabbitPermissionDialog.vue';
import RabbitTopicPermissionDialog from './RabbitTopicPermissionDialog.vue';
import RabbitUserAccessTables from './RabbitUserAccessTables.vue';
import RabbitUserLimitDialog from './RabbitUserLimitDialog.vue';

interface PendingClear {
  title: string;
  description: string;
  run: () => Promise<boolean>;
}

const props = defineProps<{ connection: Connection; userName: string }>();

const user = useBrokerRequest(() =>
  rabbitmqService.user(props.connection, props.userName)
);
const vhosts = useBrokerRequest(() => rabbitmqService.vhosts(props.connection));
const { isSaving, run, deleteUser } = useRabbitUserActions(
  () => props.connection
);
const usersChanged = useRabbitUsersChanged();

const isEditOpen = ref(false);
const isDeleteOpen = ref(false);
const isPermissionOpen = ref(false);
const isTopicOpen = ref(false);
const isLimitOpen = ref(false);
const editingPermission = ref<RabbitUserPermission | null>(null);
const editingTopic = ref<RabbitTopicPermission | null>(null);
const editingLimit = ref<RabbitUserLimitName | null>(null);
const pendingClear = ref<PendingClear | null>(null);

const data = computed(() => user.data.value);
const appearance = computed(() =>
  data.value
    ? getRabbitUserAppearance(data.value)
    : { icon: RABBIT_TAB_ICONS.user, iconClass: '' }
);
const limits = computed(() => Object.entries(data.value?.limits ?? {}));
const canManage = computed(() =>
  Boolean(data.value?.currentUser.tags.includes(RABBIT_ADMINISTRATOR_TAG))
);
const isSelf = computed(() => data.value?.currentUser.name === props.userName);

/** Run a change, then reload this tab and close the dialog on success. */
const apply = async (
  message: string,
  change: (target: Connection) => Promise<unknown>,
  close?: () => void
) => {
  if (await run(props.userName, message, change)) {
    close?.();
    await user.load();
  }
};

const openPermission = (permission: RabbitUserPermission | null) => {
  editingPermission.value = permission;
  isPermissionOpen.value = true;
};

const openTopic = (permission: RabbitTopicPermission | null) => {
  editingTopic.value = permission;
  isTopicOpen.value = true;
};

const openLimit = (limitName: RabbitUserLimitName | null) => {
  editingLimit.value = limitName;
  isLimitOpen.value = true;
};

const askClear = (clear: PendingClear) => {
  pendingClear.value = clear;
};

const confirmClear = async () => {
  const clear = pendingClear.value;
  pendingClear.value = null;
  if (clear && (await clear.run())) await user.load();
};

const clearPermission = (permission: RabbitUserPermission) =>
  askClear({
    title: `Clear access to "${permission.vhost}"?`,
    description: `${props.userName} will no longer reach queues or exchanges on this virtual host.`,
    run: () =>
      run(props.userName, 'Permission cleared', target =>
        rabbitmqService.clearPermission(
          target,
          props.userName,
          permission.vhost
        )
      ),
  });

const clearTopic = (permission: RabbitTopicPermission) =>
  askClear({
    title: `Clear topic permission on "${permission.exchange}"?`,
    description: 'Routing keys on this exchange are no longer restricted.',
    run: () =>
      run(props.userName, 'Topic permission cleared', target =>
        rabbitmqService.clearTopicPermission(target, props.userName, {
          vhost: permission.vhost,
          exchange: permission.exchange,
        })
      ),
  });

const clearLimit = (limitName: string) =>
  askClear({
    title: `Clear ${limitName}?`,
    description: `${props.userName} will no longer be capped by this limit.`,
    run: () =>
      run(props.userName, 'Limit cleared', target =>
        rabbitmqService.clearUserLimit(
          target,
          props.userName,
          limitName as RabbitUserLimitName
        )
      ),
  });

const loadExchanges = (vhost: string) =>
  rabbitmqService.exchanges(props.connection, vhost);

const confirmDelete = async () => {
  if (await deleteUser(props.userName)) isDeleteOpen.value = false;
};

usersChanged.on(event => {
  if (
    event.connectionId === props.connection.id &&
    event.userName === props.userName &&
    !event.isDeleted &&
    !isSaving.value
  ) {
    void user.load();
  }
});

onMounted(() => {
  void user.load();
  void vhosts.load();
});
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3">
    <ToolPageHeader :icon="appearance.icon" :title="userName">
      <template #context>
        <template v-if="data">
          <Badge v-for="tag in data.tags" :key="tag" variant="outline">
            {{ tag }}
          </Badge>
          <Badge v-if="!data.tags.length" variant="outline">no tags</Badge>
          <Badge v-if="isSelf" variant="secondary">you</Badge>
          <span>
            {{
              data.hasPassword
                ? 'Can log in with password'
                : 'No password (certificate or external auth only)'
            }}
          </span>
        </template>
      </template>
      <template #actions>
        <template v-if="data && canManage">
          <Button size="xxs" variant="outline" @click="isEditOpen = true">
            <Icon name="hugeicons:pencil-edit-02" class="size-3.5!" />
            Edit
          </Button>
          <Button
            size="xxs"
            variant="outline"
            class="text-destructive"
            :disabled="isSelf"
            :title="
              isSelf ? 'OrcaQ is connected as this user' : 'Delete this user'
            "
            @click="isDeleteOpen = true"
          >
            <Icon name="hugeicons:delete-02" class="size-3.5!" />
            Delete
          </Button>
        </template>
        <Button
          size="xxs"
          variant="outline"
          :disabled="user.isLoading.value"
          @click="user.load()"
        >
          <Icon name="hugeicons:redo" class="size-3.5!" />
          Refresh
        </Button>
      </template>
    </ToolPageHeader>

    <BaseNotice v-if="user.error.value" variant="destructive">
      {{ user.error.value }}
    </BaseNotice>
    <BaseNotice v-else-if="data && !canManage" variant="secondary">
      Read only: changing users needs the "administrator" tag on
      {{ data.currentUser.name }}.
    </BaseNotice>

    <div class="relative grid gap-3 lg:grid-cols-2">
      <LoadingOverlay :visible="user.isLoading.value && !data" />

      <section class="space-y-2 rounded-lg border bg-background p-3">
        <h3
          class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          Tags
        </h3>
        <p v-if="!data?.tags.length" class="text-xs text-muted-foreground">
          No tags: this user can use AMQP but not the Management UI.
        </p>
        <dl v-else class="grid gap-1.5 text-xs">
          <template v-for="tag in data.tags" :key="tag">
            <dt class="font-medium">{{ tag }}</dt>
            <dd class="text-muted-foreground -mt-1">
              {{ RABBIT_USER_TAG_DESCRIPTIONS[tag] ?? 'Custom tag.' }}
            </dd>
          </template>
        </dl>
      </section>

      <section class="space-y-2 rounded-lg border bg-background p-3">
        <div class="flex items-center justify-between gap-2">
          <h3
            class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Limits
          </h3>
          <Button
            v-if="canManage"
            size="xxs"
            variant="outline"
            @click="openLimit(null)"
          >
            <Icon name="hugeicons:add-01" class="size-3.5!" />
            Set limit
          </Button>
        </div>
        <p v-if="!limits.length" class="text-xs text-muted-foreground">
          No per-user limits.
        </p>
        <dl
          v-else
          class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 text-xs"
        >
          <template v-for="[name, value] in limits" :key="name">
            <dt class="font-mono text-muted-foreground">{{ name }}</dt>
            <dd class="tabular-nums">{{ value }}</dd>
            <dd class="whitespace-nowrap">
              <template v-if="canManage">
                <Button
                  size="iconSm"
                  variant="ghost"
                  title="Edit limit"
                  @click="openLimit(name as RabbitUserLimitName)"
                >
                  <Icon name="hugeicons:pencil-edit-02" class="size-3.5!" />
                </Button>
                <Button
                  size="iconSm"
                  variant="ghost"
                  title="Clear limit"
                  @click="clearLimit(name)"
                >
                  <Icon
                    name="hugeicons:delete-02"
                    class="size-3.5! text-destructive"
                  />
                </Button>
              </template>
            </dd>
          </template>
        </dl>
      </section>
    </div>

    <RabbitUserAccessTables
      :permissions="data?.permissions ?? []"
      :topic-permissions="data?.topicPermissions ?? []"
      :can-manage="canManage"
      @add-permission="openPermission(null)"
      @edit-permission="openPermission"
      @clear-permission="clearPermission"
      @add-topic-permission="openTopic(null)"
      @edit-topic-permission="openTopic"
      @clear-topic-permission="clearTopic"
    />

    <template v-if="data">
      <RabbitEditUserDialog
        v-model:open="isEditOpen"
        :user="data"
        :is-saving="isSaving"
        @save="
          apply(
            'User updated',
            target => rabbitmqService.updateUser(target, $event),
            () => (isEditOpen = false)
          )
        "
      />
      <RabbitPermissionDialog
        v-model:open="isPermissionOpen"
        :user-name="userName"
        :vhosts="vhosts.data.value ?? []"
        :initial="editingPermission"
        :is-saving="isSaving"
        @save="
          apply(
            'Permission saved',
            target => rabbitmqService.setPermission(target, userName, $event),
            () => (isPermissionOpen = false)
          )
        "
      />
      <RabbitTopicPermissionDialog
        v-model:open="isTopicOpen"
        :user-name="userName"
        :vhosts="vhosts.data.value ?? []"
        :load-exchanges="loadExchanges"
        :initial="editingTopic"
        :is-saving="isSaving"
        @save="
          apply(
            'Topic permission saved',
            target =>
              rabbitmqService.setTopicPermission(target, userName, $event),
            () => (isTopicOpen = false)
          )
        "
      />
      <RabbitUserLimitDialog
        v-model:open="isLimitOpen"
        :user-name="userName"
        :limits="data.limits"
        :initial-name="editingLimit"
        :is-saving="isSaving"
        @save="
          apply(
            'Limit saved',
            target => rabbitmqService.setUserLimit(target, userName, $event),
            () => (isLimitOpen = false)
          )
        "
      />
      <RabbitDeleteUserDialog
        v-model:open="isDeleteOpen"
        :user-name="userName"
        :is-saving="isSaving"
        @confirm="confirmDelete"
      />
    </template>

    <AlertDialog
      :open="Boolean(pendingClear)"
      @update:open="!$event && (pendingClear = null)"
    >
      <AlertDialogContent class="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{{ pendingClear?.title }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ pendingClear?.description }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" @click="confirmClear">Clear</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
