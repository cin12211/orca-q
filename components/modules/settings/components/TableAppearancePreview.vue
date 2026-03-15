<script setup lang="ts">
const props = defineProps<{
  fontSize: number;
  rowHeight: number;
  accentColor: string;
  headerFontSize: number;
  headerFontWeight: number;
  headerBackgroundColor: string;
}>();

const SAMPLE_ROWS = [
  { id: 1, name: 'alice_db', status: 'Active', size: '2.4 GB' },
  { id: 2, name: 'orders_2024', status: 'Active', size: '18.1 GB' },
  { id: 3, name: 'analytics', status: 'Idle', size: '512 MB' },
];

const headerStyle = computed(() => ({
  fontSize: `${props.headerFontSize}px`,
  fontWeight: props.headerFontWeight,
  height: `${props.rowHeight}px`,
  lineHeight: `${props.rowHeight}px`,
  backgroundColor: props.headerBackgroundColor || undefined,
}));

const rowStyle = computed(() => ({
  fontSize: `${props.fontSize}px`,
  height: `${props.rowHeight}px`,
  lineHeight: `${props.rowHeight}px`,
}));

const selectedRowStyle = computed(() => ({
  ...rowStyle.value,
  backgroundColor: props.accentColor + '33',
  borderLeft: `2px solid ${props.accentColor}`,
}));
</script>

<template>
  <div
    class="border rounded overflow-hidden text-xs select-none pointer-events-none"
  >
    <!-- Header -->
    <div
      class="grid grid-cols-4 bg-muted border-b text-muted-foreground"
      :style="headerStyle"
    >
      <div class="px-2 flex items-center border-r">#</div>
      <div class="px-2 flex items-center border-r">Database</div>
      <div class="px-2 flex items-center border-r">Status</div>
      <div class="px-2 flex items-center">Size</div>
    </div>

    <!-- Row 1 — selected -->
    <div class="grid grid-cols-4 border-b" :style="selectedRowStyle">
      <div class="px-2 flex items-center border-r opacity-50">1</div>
      <div class="px-2 flex items-center border-r">alice_db</div>
      <div class="px-2 flex items-center border-r">Active</div>
      <div class="px-2 flex items-center">2.4 GB</div>
    </div>

    <!-- Rows 2-3 — normal -->
    <div
      v-for="(row, index) in SAMPLE_ROWS.slice(1)"
      :key="row.id"
      class="grid grid-cols-4 border-b last:border-b-0"
      :style="
        index % 2 === 0
          ? { ...rowStyle, backgroundColor: 'var(--muted)' }
          : rowStyle
      "
    >
      <div class="px-2 flex items-center border-r opacity-50">{{ row.id }}</div>
      <div class="px-2 flex items-center border-r">{{ row.name }}</div>
      <div class="px-2 flex items-center border-r">{{ row.status }}</div>
      <div class="px-2 flex items-center">{{ row.size }}</div>
    </div>
  </div>
</template>
