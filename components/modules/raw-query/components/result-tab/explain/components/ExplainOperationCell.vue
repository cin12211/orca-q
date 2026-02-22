<script setup lang="ts">
/** AG Grid passes the full row data via `params.data` and the cell value via `params.value`. */
interface CellParams {
  data: {
    treePrefix: string;
    nodeType: string;
    nodeTypeCategory: string;
    contextLabel: string;
    contextKind: string; // 'relation' | 'sort' | 'join' | 'group' | ''
  };
}

const props = defineProps<{ params: CellParams }>();

const data = computed(() => props.params?.data ?? {});
</script>

<template>
  <div
    class="flex items-center text-xs h-full w-full overflow-hidden whitespace-nowrap"
  >
    <!-- Tree connector chars: fixed monospace stack -->
    <span
      v-if="data.treePrefix"
      class="text-neutral-400 shrink-0 whitespace-pre"
      style="
        font-family:
          ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
      "
    >
      {{ data.treePrefix }}
    </span>

    <!-- Node type: Simplified to just text with subtle color coding -->
    <span v-if="data.nodeType" class="font-normal shrink-0">
      {{ data.nodeType }}
    </span>

    <!-- Context annotation: Smaller, minimalist secondary text -->
    <span
      v-if="data.contextLabel"
      class="text-[10px] pl-0.5 text-muted-foreground truncate shrink min-w-0"
    >
      {{ data.contextLabel }}
    </span>
  </div>
</template>
