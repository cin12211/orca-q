<script setup lang="ts">
import { toast } from 'vue-sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '~/components/ui/tooltip';
import type { RedisPerformanceInsight } from '~/core/types/instance-insights.types';
import InsightKpiCard from './InsightKpiCard.vue';

const props = defineProps<{
  performance: RedisPerformanceInsight | undefined;
  dbIndex?: number;
}>();

const slowlogSearch = ref('');
const commandSearch = ref('');

const numberFormatter = new Intl.NumberFormat();

function fmt(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '0';
  return numberFormatter.format(Number(value));
}

const filteredSlowlog = computed(() => {
  const list = props.performance?.slowlog || [];
  const q = slowlogSearch.value.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    e =>
      e.command.toLowerCase().includes(q) ||
      (e.clientAddr && e.clientAddr.toLowerCase().includes(q))
  );
});

const filteredCommands = computed(() => {
  const list = props.performance?.commandStats || [];
  const q = commandSearch.value.trim().toLowerCase();
  if (!q) return list;
  return list.filter(c => c.command.toLowerCase().includes(q));
});

function copyLatencyDoctor() {
  const text = props.performance?.latencyDoctor || '';
  if (!text) return;
  navigator.clipboard.writeText(text);
  toast.success('Latency doctor report copied to clipboard');
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-y-auto space-y-4 pr-1">
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

    <!-- Top KPI Cards -->
    <div class="grid gap-3 md:grid-cols-3 shrink-0">
      <InsightKpiCard
        label="Instantaneous Ops/sec"
        :value="fmt(performance?.instantaneousOpsPerSec)"
        :show-badge="false"
        icon="hugeicons:flash"
        subtext="Commands executed per second"
      />
      <InsightKpiCard
        label="Total commands processed"
        :value="fmt(performance?.totalCommandsProcessed)"
        :show-badge="false"
        icon="hugeicons:activity-02"
        subtext="Lifetime processed commands"
      />
      <InsightKpiCard
        label="Blocked clients"
        :value="fmt(performance?.blockedClients)"
        :show-badge="false"
        icon="hugeicons:alert-circle"
        :tone="
          performance && performance.blockedClients > 0 ? 'warning' : 'default'
        "
        subtext="Clients waiting on blocking calls (BLPOP, etc)"
      />
    </div>

    <!-- Latency Doctor Section -->
    <div class="rounded-lg border bg-card/60 p-3 space-y-2 shrink-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <h3 class="text-xs font-medium">Latency Doctor Report</h3>
        </div>
        <Button
          v-if="performance?.latencyDoctor"
          size="xxs"
          variant="outline"
          class="h-6 text-xxs"
          @click="copyLatencyDoctor"
        >
          <Icon name="hugeicons:redo" class="size-3" />
          Copy Report
        </Button>
      </div>

      <div
        class="rounded-md bg-muted/40 border p-3 font-mono text-[11px] text-foreground overflow-x-auto max-h-32 overflow-y-auto"
      >
        <pre class="whitespace-pre-wrap">{{
          performance?.latencyDoctor || 'No latency doctor output available.'
        }}</pre>
      </div>
    </div>

    <!-- Main Grid: Slowlog Table (2/3) & Command Stats Table (1/3) -->
    <div class="grid gap-4 lg:grid-cols-3 flex-1 min-h-0">
      <!-- Slowlog Data Table (2/3 width) -->
      <div
        class="lg:col-span-2 rounded-lg border bg-card/60 p-3 flex flex-col min-h-[240px]"
      >
        <div
          class="flex h-6 items-center justify-between pb-2.5 border-b mb-2.5 shrink-0 gap-2"
        >
          <div class="flex items-center gap-2">
            <h3 class="text-xs font-medium">Slowlog Entries</h3>
          </div>

          <div class="relative w-44">
            <Icon
              name="hugeicons:search-01"
              class="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground"
            />
            <Input
              v-model="slowlogSearch"
              placeholder="Search slowlog..."
              class="h-6 pl-7 text-[11px] bg-background"
            />
          </div>
        </div>

        <div
          class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-md border bg-background"
        >
          <Table class="text-xs w-full table-fixed">
            <TableHeader
              class="bg-muted/60 text-muted-foreground sticky top-0 z-10"
            >
              <TableRow>
                <TableHead class="py-1.5 px-2.5 font-medium">Command</TableHead>
                <TableHead class="py-1.5 px-2.5 font-medium w-36"
                  >Client</TableHead
                >
                <TableHead class="py-1.5 px-2.5 font-medium text-right w-24"
                  >Duration</TableHead
                >
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-if="filteredSlowlog.length === 0"
                class="hover:bg-transparent"
              >
                <TableCell colspan="3" class="py-6">
                  <BaseEmpty desc="No slowlog entries recorded." hidden-icon />
                </TableCell>
              </TableRow>
              <TableRow
                v-for="entry in filteredSlowlog"
                :key="entry.id"
                class="hover:bg-muted/30"
              >
                <TableCell
                  class="py-1.5 px-2.5 break-all whitespace-normal align-top"
                >
                  <code
                    class="font-mono text-[11px] font-medium text-primary break-all whitespace-pre-wrap"
                  >
                    {{ entry.command || 'unknown' }}
                  </code>
                </TableCell>
                <TableCell
                  class="py-1.5 px-2.5 text-muted-foreground font-mono text-[11px] truncate align-top"
                >
                  <Tooltip v-if="entry.clientAddr">
                    <TooltipTrigger as-child>
                      <span
                        class="truncate block cursor-help"
                        :title="entry.clientAddr"
                      >
                        {{ entry.clientAddr }}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" class="text-xs font-mono">
                      Client: {{ entry.clientAddr }}
                    </TooltipContent>
                  </Tooltip>
                  <span v-else>n/a</span>
                </TableCell>
                <TableCell
                  class="py-1.5 px-2.5 text-right font-mono text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap align-top"
                >
                  {{ fmt(entry.durationMicros) }} µs
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <!-- Command Stats Table (1/3 width) -->
      <div
        class="lg:col-span-1 rounded-lg border bg-card/60 p-3 flex flex-col min-h-[240px]"
      >
        <div
          class="flex h-6 items-center justify-between pb-2.5 border-b mb-2.5 shrink-0 gap-2"
        >
          <div class="flex items-center gap-2">
            <h3 class="text-xs font-medium">Command Stats</h3>
          </div>

          <div class="relative w-44">
            <Icon
              name="hugeicons:search-01"
              class="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground"
            />
            <Input
              v-model="commandSearch"
              placeholder="Search command..."
              class="h-6 pl-7 text-[11px] bg-background"
            />
          </div>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
          <BaseEmpty
            v-if="filteredCommands.length === 0"
            desc="No command stats recorded."
            hidden-icon
            class="py-6"
          />
          <div
            v-for="command in filteredCommands"
            :key="command.command"
            class="rounded-md border bg-background px-2.5 py-1.5 text-xs flex items-center justify-between"
          >
            <code class="font-mono font-medium text-foreground uppercase">{{
              command.command
            }}</code>
            <span class="text-muted-foreground">
              {{ fmt(command.calls) }} calls ·
              <span class="font-mono font-medium text-primary"
                >{{ command.usecPerCall.toFixed(2) }} µs/call</span
              >
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
