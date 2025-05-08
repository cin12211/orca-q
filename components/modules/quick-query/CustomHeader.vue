<script setup lang="ts">
import { Icon } from '#components';
import type { ColumnMetadata } from '~/server/api/get-tables';

//TODO: refactor, rename for custom header table

// Define props interface
interface Params {
  displayName: string;
  fieldId: string;
  allowSorting: boolean;
  sort?: OrderBy['order'];
  onUpdateSort: (value: OrderBy) => void;
  isForeignKey: boolean;
  isPrimaryKey: boolean;
  dataType: string;
}

const props = defineProps<{
  params: Params;
}>();

const onSortChanged = () => {
  if (!props.params.allowSorting) {
    return;
  }

  const sort = props.params.sort;

  const updateSort = props.params.onUpdateSort;
  if (sort === 'ASC') {
    updateSort({
      order: 'DESC',
      columnName: props.params.displayName,
    });
  } else if (sort === 'DESC') {
    updateSort({});
  } else {
    updateSort({
      order: 'ASC',
      columnName: props.params.displayName,
    });
  }
};
</script>

<template>
  <div
    class="ag-header-cell-label cursor-pointer"
    data-ref="eLabel"
    role="presentation"
    @click="onSortChanged"
  >
    <span
      class="ag-header-cell-text items-center flex gap-0.5"
      data-ref="eText"
    >
      <Icon
        v-if="!!props.params.isPrimaryKey"
        name="lucide:key-round"
        class="min-w-3! text-yellow-500"
      >
      </Icon>

      <Icon
        v-if="!!props.params.isForeignKey"
        name="lucide:key-round"
        class="min-w-3!"
      >
      </Icon>
      {{ props.params.displayName }}

      <p class="text-[10px]!">
        {{ props.params.dataType }}
      </p>
    </span>
    <!--AG-SORT-INDICATOR-->
    <span
      class="ag-sort-indicator-container"
      data-ref="eSortIndicator"
      v-if="params.sort"
    >
      <span
        class="ag-sort-indicator-icon ag-sort-ascending-icon"
        data-ref="eSortAsc"
        aria-hidden="true"
        v-if="params.sort === 'ASC'"
      >
        <span
          class="ag-icon ag-icon-asc"
          role="presentation"
          unselectable="on"
        />
      </span>
      <span
        class="ag-sort-indicator-icon ag-sort-descending-icon"
        data-ref="eSortDesc"
        aria-hidden="true"
        v-else
      >
        <span
          class="ag-icon ag-icon-desc"
          role="presentation"
          unselectable="on"
        />
      </span>
    </span>
  </div>

  <!-- <div class="bg-red-600 w-full h-full flex flex-col justify-center">
    <div class="customHeaderLabel truncate">
      {{ params.displayName }}

      <Icon name="hugeicons:arrow-down-01" class="size-4 min-w-4" />
      <Icon name="hugeicons:arrow-up-01" class="size-4 min-w-4" />
    </div>
  </div> -->
</template>
