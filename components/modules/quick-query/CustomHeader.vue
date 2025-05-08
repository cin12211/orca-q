<script setup lang="ts">
//TODO: refactor, rename for custom header table

// Define props interface
interface Params {
  displayName: string;

  fieldId: string;
  allowSorting: boolean;
  sort?: OrderBy['order'];
  onUpdateSort: (value: OrderBy) => void;
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
    <span class="ag-header-cell-text" data-ref="eText">{{
      props.params.displayName
    }}</span>
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
