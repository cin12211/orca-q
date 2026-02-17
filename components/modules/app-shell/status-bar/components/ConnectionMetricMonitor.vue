<script setup lang="ts">
import { ONE_SECOND } from '~/core/constants';
import { useAppContext } from '~/core/contexts/useAppContext';

const { connectionStore } = useAppContext();

let intervalId: NodeJS.Timer | undefined;

const sessions = ref<number>();
const tps = ref<number>();
const blksRead = ref<number>();
const blksHit = ref<number>();

onMounted(() => {
  intervalId = setInterval(async () => {
    if (!connectionStore.selectedConnection) return;

    //TODO: need to review api for metrics
    const result = await $fetch('/api/getMetricMonitor', {
      method: 'POST',
      body: {
        dbConnectionString:
          connectionStore.selectedConnection?.connectionString,
      },
    });

    if (!result) return;

    sessions.value = result.sessions;
    tps.value = result.tps;
    blksRead.value = result.block_io.blks_read;
    blksHit.value = result.block_io.blks_hit;
    //TODO : make to 5
  }, 100000000 * ONE_SECOND);
});

onBeforeUnmount(() => {
  clearInterval(intervalId as unknown as number);
});
</script>
<template>
  <div class="flex items-center h-full gap-3 text-xs text-muted-foreground">
    <Tooltip>
      <TooltipTrigger as-child>
        <div class="h-full hover:bg-muted flex items-center px-1 rounded">
          Sessions:
          <p class="text-black inline">
            {{ sessions ?? 0 }}
          </p>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Server Sessions: Number of active database sessions</p>
      </TooltipContent>
    </Tooltip>
    <Tooltip>
      <TooltipTrigger as-child>
        <div class="h-full hover:bg-muted flex items-center px-1 rounded">
          Block IO:
          <p class="text-black inline">
            {{ blksRead ?? 0 }}/{{ blksHit ?? 0 }}
          </p>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Blocks Read/Hit: Disk blocks read vs. cache hits</p>
      </TooltipContent>
    </Tooltip>
    <Tooltip>
      <TooltipTrigger as-child>
        <div class="h-full hover:bg-muted flex items-center px-1 rounded">
          TPS:
          <p class="text-black inline">{{ tps ?? 0 }}</p>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Transactions Per Second: Rate of database transactions</p>
      </TooltipContent>
    </Tooltip>
  </div>
</template>
