<script setup lang="ts">
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#components';

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    measureOnly?: boolean;
  }>(),
  {
    disabled: false,
    measureOnly: false,
  }
);

const emit = defineEmits<{
  (e: 'openStarterSql'): void;
  (e: 'openNewSqlFile'): void;
  (e: 'openSchemaBrowser'): void;
  (e: 'openInstanceInsights'): void;
}>();
</script>

<template>
  <div class="flex items-center">
    <template v-if="props.measureOnly">
      <Button
        variant="outline"
        size="xxs"
        class="rounded-r-none border-r-0 pr-0"
      >
        <Icon name="hugeicons:plus-sign" class="size-4 min-w-4" />
      </Button>
      <Button
        variant="outline"
        size="xxs"
        class="rounded-l-none border-l-0 pl-0 pr-1"
      >
        <Icon name="hugeicons:arrow-down-01" class="size-3!" />
      </Button>
    </template>

    <template v-else>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="outline"
            size="xxs"
            class="rounded-r-none border-r-0 pr-0"
            :disabled="props.disabled"
            aria-label="New SQL file"
            @click="emit('openStarterSql')"
          >
            <Icon name="hugeicons:plus-sign" class="size-4 min-w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>New SQL file</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            variant="outline"
            size="xxs"
            class="rounded-l-none border-l-0 pl-0 pr-1"
            :disabled="props.disabled"
            aria-label="Open tab options"
          >
            <Icon name="hugeicons:arrow-down-01" class="size-3!" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" class="min-w-52">
          <DropdownMenuLabel class="py-0">Open new tab</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            class="h-8 cursor-pointer"
            @select="emit('openNewSqlFile')"
          >
            <Icon name="hugeicons:document-code" class="mr-2 size-4 min-w-4" />
            New SQL file
          </DropdownMenuItem>

          <DropdownMenuItem
            class="h-8 cursor-pointer"
            @select="emit('openSchemaBrowser')"
          >
            <Icon name="hugeicons:database" class="mr-2 size-4 min-w-4" />
            Schema browser
          </DropdownMenuItem>

          <DropdownMenuItem
            class="h-8 cursor-pointer"
            @select="emit('openInstanceInsights')"
          >
            <Icon name="hugeicons:activity-02" class="mr-2 size-4 min-w-4" />
            Instance insights
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </template>
  </div>
</template>
