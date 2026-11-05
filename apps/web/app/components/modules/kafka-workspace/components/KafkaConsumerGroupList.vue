<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  formatNumber,
  useAutoRefresh,
  useBrokerRequest,
} from '~/components/modules/shared/message-broker';
import type { Connection } from '~/core/stores';
import { useKafkaTabs } from '../hooks';
import { kafkaService } from '../services';

const props = defineProps<{ connection: Connection }>();

const { openGroup } = useKafkaTabs();
const groups = useBrokerRequest(() => kafkaService.groups(props.connection));
useAutoRefresh(groups.load);
const search = ref('');

const rows = computed(() =>
  (groups.data.value ?? [])
    .filter(group =>
      group.groupId.toLowerCase().includes(search.value.toLowerCase())
    )
    .sort((left, right) => right.totalLag - left.totalLag)
);

onMounted(() => groups.load());
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3 p-3">
    <ToolPageHeader
      icon="hugeicons:user-multiple"
      title="Consumer Groups"
      description="Sorted by total lag, highest first."
    >
      <template #actions>
        <Input
          v-model="search"
          placeholder="Filter by group id"
          class="h-7 w-48 text-xs"
        />
        <Button
          size="xxs"
          variant="outline"
          :disabled="groups.isLoading.value"
          @click="groups.load()"
        >
          <Icon name="hugeicons:redo" class="size-3.5!" />
          Refresh
        </Button>
      </template>
    </ToolPageHeader>

    <BaseNotice v-if="groups.error.value" variant="destructive">{{
      groups.error.value
    }}</BaseNotice>

    <div class="relative min-h-0 flex-1 overflow-auto rounded-lg border">
      <LoadingOverlay :visible="groups.isLoading.value && !groups.data.value" />
      <Table class="text-xs">
        <TableHeader class="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead>Group</TableHead>
            <TableHead>State</TableHead>
            <TableHead class="text-right">Members</TableHead>
            <TableHead>Topics</TableHead>
            <TableHead class="text-right">Total lag</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="group in rows"
            :key="group.groupId"
            class="cursor-pointer"
            @click="openGroup(group.groupId)"
          >
            <TableCell class="font-mono">{{ group.groupId }}</TableCell>
            <TableCell>{{ group.state }}</TableCell>
            <TableCell class="text-right tabular-nums">{{
              group.memberCount
            }}</TableCell>
            <TableCell class="font-mono truncate max-w-64">{{
              group.topics.join(', ') || '-'
            }}</TableCell>
            <TableCell
              class="text-right tabular-nums"
              :class="group.totalLag > 0 && 'text-amber-500'"
            >
              {{ formatNumber(group.totalLag) }}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <BaseEmpty
        v-if="groups.data.value && !rows.length"
        title="No consumer groups"
        desc="No group has connected to this cluster yet."
        icon="hugeicons:user-multiple"
      />
    </div>
  </div>
</template>
