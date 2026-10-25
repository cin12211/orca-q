<script setup lang="ts">
import {
  kafkaService,
  useKafkaTabs,
} from '~/components/modules/kafka-workspace';
import {
  formatNumber,
  useBrokerRequest,
} from '~/components/modules/message-broker';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { useManagementConnectionStore } from '~/core/stores';
import { ManagementSidebarHeader } from '../shared';

const connectionStore = useManagementConnectionStore();
const { workspaceId } = useWorkspaceConnectionRoute();
const { openTopic, openGroup } = useKafkaTabs();
const connection = computed(() => connectionStore.selectedConnection);
const searchQuery = ref('');

const topics = useBrokerRequest(async () =>
  connection.value ? kafkaService.topics(connection.value) : []
);
const groups = useBrokerRequest(async () =>
  connection.value ? kafkaService.groups(connection.value) : []
);

const loadAll = () => Promise.all([topics.load(), groups.load()]);

const matches = (name: string) =>
  name.toLowerCase().includes(searchQuery.value.trim().toLowerCase());
const filteredTopics = computed(() =>
  (topics.data.value ?? []).filter(topic => matches(topic.name))
);
const filteredGroups = computed(() =>
  (groups.data.value ?? []).filter(group => matches(group.groupId))
);
const error = computed(() => topics.error.value || groups.error.value);

watch(() => connection.value?.id, loadAll, { immediate: true });
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-hidden">
    <ManagementSidebarHeader
      v-model:search="searchQuery"
      title="Kafka"
      :show-connection="true"
      :workspace-id="workspaceId"
      :show-search="true"
      search-placeholder="Filter topics and groups..."
    >
      <template #actions>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button size="iconSm" variant="ghost" @click="loadAll()">
              <Icon
                name="hugeicons:redo"
                :class="[
                  'size-4! min-w-4',
                  topics.isLoading.value && 'animate-spin',
                ]"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh</TooltipContent>
        </Tooltip>
      </template>
    </ManagementSidebarHeader>

    <div
      class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 pb-3 pt-2 text-xs"
    >
      <BaseNotice v-if="error" variant="destructive">{{ error }}</BaseNotice>

      <section class="space-y-1">
        <h3
          class="px-1 font-medium uppercase tracking-wider text-muted-foreground"
        >
          Topics ({{ filteredTopics.length }})
        </h3>
        <button
          v-for="topic in filteredTopics"
          :key="topic.name"
          type="button"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-muted/60 cursor-pointer"
          @click="openTopic(topic.name)"
        >
          <Icon
            name="hugeicons:message-multiple-01"
            class="size-3.5 shrink-0 text-sky-500"
          />
          <span class="truncate font-mono flex-1">{{ topic.name }}</span>
          <span
            v-if="topic.offlinePartitions || topic.underReplicatedPartitions"
            class="size-2 shrink-0 rounded-full"
            :class="topic.offlinePartitions ? 'bg-rose-500' : 'bg-amber-500'"
            :title="
              topic.offlinePartitions
                ? 'Offline partitions'
                : 'Under-replicated partitions'
            "
          />
          <span class="tabular-nums text-muted-foreground">{{
            formatNumber(topic.messageCount)
          }}</span>
        </button>
        <p
          v-if="topics.data.value && !filteredTopics.length"
          class="px-2 text-muted-foreground"
        >
          No topics
        </p>
      </section>

      <section class="space-y-1">
        <h3
          class="px-1 font-medium uppercase tracking-wider text-muted-foreground"
        >
          Consumer groups ({{ filteredGroups.length }})
        </h3>
        <button
          v-for="group in filteredGroups"
          :key="group.groupId"
          type="button"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-muted/60 cursor-pointer"
          @click="openGroup(group.groupId)"
        >
          <Icon
            name="hugeicons:user-multiple"
            class="size-3.5 shrink-0 text-sky-500"
          />
          <span class="truncate font-mono flex-1">{{ group.groupId }}</span>
          <span
            class="tabular-nums"
            :class="
              group.totalLag > 0 ? 'text-amber-500' : 'text-muted-foreground'
            "
            title="Total lag"
          >
            {{ formatNumber(group.totalLag) }}
          </span>
        </button>
        <p
          v-if="groups.data.value && !filteredGroups.length"
          class="px-2 text-muted-foreground"
        >
          No consumer groups
        </p>
      </section>
    </div>
  </div>
</template>
