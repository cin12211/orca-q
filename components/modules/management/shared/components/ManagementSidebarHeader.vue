<script setup lang="ts">
import { Icon } from '#components';
import { Input, Button } from '#components';
import ConnectionSelector from '~/components/modules/selectors/ConnectionSelector.vue';
import SchemaSelector from '~/components/modules/selectors/SchemaSelector.vue';

interface Props {
  title: string;
  showConnection?: boolean;
  showSchema?: boolean;
  workspaceId?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  showConnection: false,
  showSchema: false,
  showSearch: false,
  searchPlaceholder: 'Search...',
});

const search = defineModel<string>('search', { default: '' });

const onClearSearch = () => {
  search.value = '';
};
</script>

<template>
  <div class="flex flex-col w-full shrink-0">
    <!-- Connection & Schema Selectors -->
    <div
      v-if="showConnection || showSchema"
      class="relative w-full items-center px-2 pt-1 space-y-1"
    >
      <div v-if="showConnection">
        <p
          class="text-sm font-medium text-muted-foreground leading-none block pb-1"
        >
          Connections
        </p>
        <ConnectionSelector class="w-full!" :workspaceId="workspaceId!" />
      </div>

      <div v-if="showSchema">
        <p
          class="text-sm font-medium text-muted-foreground leading-none block pb-1"
        >
          Schemas
        </p>
        <SchemaSelector class="w-full!" />
      </div>
    </div>

    <!-- Title and Actions -->
    <div
      :class="[
        'px-2 flex items-center justify-between',
        showConnection || showSchema ? 'pt-2' : 'pt-1',
      ]"
    >
      <p class="text-sm font-medium text-muted-foreground leading-none">
        {{ title }}
      </p>

      <div v-if="$slots.actions" class="flex items-center">
        <slot name="actions" />
      </div>
    </div>

    <!-- Search -->
    <div v-if="showSearch" class="px-2 pb-1">
      <div class="relative w-full">
        <Input
          type="text"
          :placeholder="searchPlaceholder"
          class="pr-6 w-full h-8"
          v-model="search"
        />

        <div
          v-if="search"
          class="absolute right-2 top-1.5 w-4 cursor-pointer hover:bg-accent"
          @click="onClearSearch"
        >
          <Icon
            name="hugeicons:cancel-01"
            class="stroke-3! text-muted-foreground"
          />
        </div>
      </div>
    </div>
  </div>
</template>
