<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import type { RedisClientInsight } from '~/core/types/instance-insights.types';
import InsightKpiCard from './InsightKpiCard.vue';

const props = defineProps<{
  clients: RedisClientInsight | undefined;
  isActionLoading: boolean;
  dbIndex?: number;
  isInitialLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'kill-client', id: string): void;
}>();

const searchQuery = ref('');
const confirmKillClient = ref<{ id: string; addr: string } | null>(null);

const numberFormatter = new Intl.NumberFormat();

function fmt(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '0';
  return numberFormatter.format(Number(value));
}

const suspiciousClientsList = computed(
  () => props.clients?.suspiciousClients || []
);
const clientList = computed(() => props.clients?.clients || []);

const filteredClients = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return clientList.value;
  return clientList.value.filter(
    c =>
      c.addr.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.cmd.toLowerCase().includes(q) ||
      `db${c.db}`.includes(q) ||
      `${c.db}` === q
  );
});

function handleRequestKill(client: { id: string; addr: string }) {
  confirmKillClient.value = client;
}

function handleConfirmKill() {
  if (confirmKillClient.value) {
    emit('kill-client', confirmKillClient.value.id);
    confirmKillClient.value = null;
  }
}
</script>

<template>
  <div class="relative flex h-full min-h-0 flex-col gap-3 overflow-hidden">
    <LoadingOverlay :visible="!!isInitialLoading" />
    <div class="flex items-center justify-between shrink-0">
      <h3
        class="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
      >
        <Icon
          name="hugeicons:globe-02"
          class="size-3.5 shrink-0 text-muted-foreground"
        />
        <span>Instance Overview</span>
      </h3>
    </div>

    <!-- Top KPI Bar -->
    <div class="grid grid-cols-2 gap-3 shrink-0">
      <InsightKpiCard
        label="Connected clients"
        :value="fmt(clients?.connectedClients)"
        :show-badge="false"
        icon="hugeicons:user-group"
        subtext="Active TCP connections across instance"
      />
      <InsightKpiCard
        label="Suspicious clients"
        :value="fmt(suspiciousClientsList.length)"
        :show-badge="false"
        icon="hugeicons:alert-circle"
        :tone="suspiciousClientsList.length > 0 ? 'warning' : 'success'"
        :subtext="
          suspiciousClientsList.length > 0
            ? 'High idle or blocked connections detected'
            : 'No connection anomalies'
        "
      />
    </div>

    <!-- Main Viewport Split Layout (Fits 100% parent height with internal scroll) -->
    <div class="flex flex-1 min-h-0 gap-3 overflow-hidden">
      <!-- Searchable Client List Data Table Panel (Left Side - Main Flex-1) -->
      <div
        class="flex-1 min-h-0 rounded-lg border bg-card/60 p-3 flex flex-col h-full overflow-hidden"
      >
        <!-- Header & Search Toolbar -->
        <div
          class="flex h-6 items-center justify-between gap-2 pb-2.5 shrink-0 border-b mb-2.5"
        >
          <div class="flex items-center gap-2">
            <h3 class="text-xs font-medium">Active Client List</h3>
            <Badge variant="secondary" class="text-xxs">
              {{ filteredClients.length }} of {{ clientList.length }}
            </Badge>
          </div>

          <div class="relative w-44">
            <Icon
              name="hugeicons:search-01"
              class="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground"
            />
            <Input
              v-model="searchQuery"
              placeholder="Search clients..."
              class="h-6 pl-7 text-[11px] bg-background"
            />
          </div>
        </div>

        <!-- Table Container with Sticky Header & Internal Scroll -->
        <div
          class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-md border bg-background"
        >
          <Table class="text-xs w-full table-fixed">
            <TableHeader class="bg-muted/60 sticky top-0 z-10 backdrop-blur-xs">
              <TableRow>
                <TableHead class="py-1.5 px-2 font-medium w-36"
                  >Address</TableHead
                >
                <TableHead class="py-1.5 px-2 font-medium">Name</TableHead>
                <TableHead class="py-1.5 px-2 font-medium text-center w-12"
                  >DB</TableHead
                >
                <TableHead class="py-1.5 px-2 font-medium w-32"
                  >Last Command</TableHead
                >
                <TableHead class="py-1.5 px-2 font-medium text-right w-16"
                  >Age</TableHead
                >
                <TableHead class="py-1.5 px-2 font-medium text-right w-16"
                  >Idle</TableHead
                >
                <TableHead class="py-1.5 px-2 font-medium text-right w-14"
                  >Action</TableHead
                >
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-if="filteredClients.length === 0"
                class="hover:bg-transparent"
              >
                <TableCell colspan="7" class="py-8">
                  <BaseEmpty
                    desc="No connected clients matching criteria."
                    hidden-icon
                  />
                </TableCell>
              </TableRow>
              <TableRow
                v-for="client in filteredClients"
                :key="client.id"
                class="hover:bg-muted/30 transition-colors"
              >
                <TableCell
                  class="py-1.5 px-2 font-mono text-[11px] font-medium align-top truncate"
                  :title="client.addr"
                  >{{ client.addr }}</TableCell
                >
                <TableCell
                  class="py-1.5 px-2 text-muted-foreground break-all whitespace-normal align-top"
                  >{{ client.name || '-' }}</TableCell
                >
                <TableCell class="py-1.5 px-2 text-center align-top">
                  <Badge variant="outline" class="text-xxs px-1 py-0 font-mono">
                    db{{ client.db }}
                  </Badge>
                </TableCell>
                <TableCell
                  class="py-1.5 px-2 break-all whitespace-normal align-top"
                >
                  <code
                    class="text-[11px] bg-muted px-1.5 py-0.5 rounded font-mono text-primary break-all whitespace-pre-wrap"
                  >
                    {{ client.cmd }}
                  </code>
                </TableCell>
                <TableCell
                  class="py-1.5 px-2 text-right font-mono text-muted-foreground align-top whitespace-nowrap"
                >
                  {{ fmt(client.ageSeconds) }}s
                </TableCell>
                <TableCell
                  class="py-1.5 px-2 text-right font-mono text-muted-foreground align-top whitespace-nowrap"
                >
                  {{ fmt(client.idleSeconds) }}s
                </TableCell>
                <TableCell class="py-1.5 px-2 text-right align-top">
                  <Button
                    size="xxs"
                    variant="secondary"
                    class="h-6 px-1.5 text-xxs"
                    :disabled="isActionLoading"
                    @click="handleRequestKill(client)"
                  >
                    Kill
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <!-- Suspicious Clients Right Panel (Internal Scroll) -->
      <div
        v-if="suspiciousClientsList.length > 0"
        class="w-1/3 min-w-[260px] max-w-[340px] rounded-lg border bg-card/60 p-3 flex flex-col min-h-0 h-full shrink-0"
      >
        <div
          class="flex h-6 items-center justify-between gap-2 pb-2.5 shrink-0 border-b mb-2.5"
        >
          <div
            class="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400"
          >
            <Icon name="hugeicons:alert-circle" class="size-4" />
            <span
              >Suspicious Warnings ({{ suspiciousClientsList.length }})</span
            >
          </div>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
          <div
            v-for="warning in suspiciousClientsList"
            :key="`${warning.clientId}-${warning.reason}`"
            class="rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs"
          >
            <p class="font-medium text-amber-700 dark:text-amber-300">
              {{ warning.reason }}
            </p>
            <p class="text-xxs text-muted-foreground mt-0.5">
              Client ID: {{ warning.clientId }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Kill Modal -->
    <Dialog
      :open="confirmKillClient !== null"
      @update:open="
        val => {
          if (!val) confirmKillClient = null;
        }
      "
    >
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle
            class="text-sm font-semibold flex items-center gap-2 text-destructive"
          >
            <Icon name="hugeicons:alert-circle" class="size-4" />
            Terminate Redis Client
          </DialogTitle>
          <DialogDescription class="text-xs">
            Are you sure you want to kill the client connection at
            <span class="font-mono font-medium text-foreground">{{
              confirmKillClient?.addr
            }}</span
            >? This operation will disconnect the client immediately.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" @click="confirmKillClient = null">
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            :disabled="isActionLoading"
            @click="handleConfirmKill"
          >
            Terminate Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
