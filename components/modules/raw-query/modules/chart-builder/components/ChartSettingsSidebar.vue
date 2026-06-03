<script setup lang="ts">
import { computed } from 'vue';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Button,
} from '#components';
import { Input } from '@/components/ui/input';
import type { MappedRawColumn } from '../../../interfaces';
import { CHART_TYPE_META } from '../constants';
import { ChartType, AggregationType, SortByType } from '../types';
import ChartTypeSelector from './ChartTypeSelector.vue';

defineProps<{
  activeTabColumns: MappedRawColumn[];
}>();

const chartTitle = defineModel<string>('chartTitle', { required: true });
const chartType = defineModel<ChartType>('chartType', { required: true });
const xAxisField = defineModel<string>('xAxisField', { required: true });
const yAxisField = defineModel<string>('yAxisField', { required: true });
const valueField = defineModel<string>('valueField', { required: true });
const categoryYField = defineModel<string>('categoryYField', {
  required: true,
});
const aggregation = defineModel<AggregationType>('aggregation', {
  required: true,
});
const groupByField = defineModel<string>('groupByField', { required: true });
const sortBy = defineModel<SortByType>('sortBy', { required: true });
const limitRows = defineModel<number | null>('limitRows', { required: true });
const showLabels = defineModel<boolean>('showLabels', { required: true });
const smoothLine = defineModel<boolean>('smoothLine', { required: true });

defineEmits<{
  reset: [];
  export: [];
}>();

/** Current chart type's field visibility schema */
const fields = computed(() => {
  const meta = CHART_TYPE_META.get(chartType.value);
  return meta?.fields ?? null;
});

/** Whether Y-axis should be shown based on type and aggregation */
const showYAxis = computed(() => {
  if (!fields.value?.yAxis) return false;
  if (
    fields.value.yAxisHiddenOnCount &&
    aggregation.value === AggregationType.COUNT
  ) {
    return false;
  }
  return true;
});
</script>

<template>
  <div
    class="w-80 border-l border-border flex h-full shrink-0 flex-col overflow-y-auto bg-background"
  >
    <div
      class="flex items-center justify-between border-b border-border px-3 py-2.5"
    >
      <div class="flex items-center gap-2">
        <Icon
          name="hugeicons:chart-column"
          class="size-4! text-muted-foreground"
        />
        <span class="text-sm font-medium">Chart Settings</span>
      </div>
      <div class="flex items-center gap-1.5">
        <Button
          v-if="xAxisField"
          variant="ghost"
          size="iconSm"
          @click="$emit('export')"
          title="Export chart as image"
        >
          <Icon name="hugeicons:download-04" class="size-4!" />
        </Button>
        <Button
          variant="ghost"
          size="iconSm"
          @click="$emit('reset')"
          title="Reset configuration"
        >
          <Icon name="hugeicons:reload" class="size-4!" />
        </Button>
      </div>
    </div>

    <div class="flex-1 space-y-3 p-3">
      <!-- Chart Title -->
      <div class="space-y-2">
        <div class="space-y-1.5">
          <p class="text-xs font-medium text-muted-foreground">Chart Title</p>
          <Input
            v-model="chartTitle"
            size="sm"
            type="text"
            placeholder="Chart Title"
          />
        </div>

        <!-- Chart Type Selector (categorized grid) -->
        <div class="space-y-1.5">
          <p class="text-xs font-medium text-muted-foreground">Chart Type</p>
          <ChartTypeSelector v-model="chartType" />
        </div>
      </div>

      <!-- Data Mapping — driven by field visibility schema -->
      <div v-if="fields" class="space-y-2">
        <p class="text-sm font-medium">Data Mapping</p>

        <!-- X-Axis Label (non-numeric) -->
        <div class="space-y-1.5" v-if="fields.xAxisLabel">
          <p class="text-xs font-medium text-muted-foreground">
            X-Axis (Label)
          </p>
          <Select v-model="xAxisField" size="xs">
            <SelectTrigger class="w-full cursor-pointer">
              <SelectValue placeholder="Select X-Axis Column" />
            </SelectTrigger>
            <SelectContent class="max-h-60">
              <SelectItem
                v-for="col in activeTabColumns"
                :key="col.queryFieldName"
                :value="col.queryFieldName"
                class="cursor-pointer"
              >
                {{ col.queryFieldName }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- X-Axis Numeric (Scatter) -->
        <div class="space-y-1.5" v-if="fields.xAxisNumeric">
          <p class="text-xs font-medium text-muted-foreground">
            X-Axis (Numeric)
          </p>
          <Select v-model="xAxisField" size="xs">
            <SelectTrigger class="w-full cursor-pointer">
              <SelectValue placeholder="Select X-Axis Column" />
            </SelectTrigger>
            <SelectContent class="max-h-60">
              <SelectItem
                v-for="col in activeTabColumns"
                :key="col.queryFieldName"
                :value="col.queryFieldName"
                class="cursor-pointer"
              >
                {{ col.queryFieldName }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Y-Axis (Values) -->
        <div class="space-y-1.5" v-if="showYAxis">
          <p class="text-xs font-medium text-muted-foreground">
            Y-Axis (Values)
          </p>
          <Select v-model="yAxisField" size="xs">
            <SelectTrigger class="w-full cursor-pointer">
              <SelectValue placeholder="Select Y-Axis Column" />
            </SelectTrigger>
            <SelectContent class="max-h-60">
              <SelectItem
                v-for="col in activeTabColumns"
                :key="col.queryFieldName"
                :value="col.queryFieldName"
                class="cursor-pointer"
              >
                {{ col.queryFieldName }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Heatmap: Category X (Columns) -->
        <div class="space-y-1.5" v-if="fields.categoryX">
          <p class="text-xs font-medium text-muted-foreground">
            Category X (Columns)
          </p>
          <Select v-model="xAxisField" size="xs">
            <SelectTrigger class="w-full cursor-pointer">
              <SelectValue placeholder="Select X Category Column" />
            </SelectTrigger>
            <SelectContent class="max-h-60">
              <SelectItem
                v-for="col in activeTabColumns"
                :key="col.queryFieldName"
                :value="col.queryFieldName"
                class="cursor-pointer"
              >
                {{ col.queryFieldName }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Heatmap: Category Y (Rows) -->
        <div class="space-y-1.5" v-if="fields.categoryY">
          <p class="text-xs font-medium text-muted-foreground">
            Category Y (Rows)
          </p>
          <Select v-model="categoryYField" size="xs">
            <SelectTrigger class="w-full cursor-pointer">
              <SelectValue placeholder="Select Y Category Column" />
            </SelectTrigger>
            <SelectContent class="max-h-60">
              <SelectItem
                v-for="col in activeTabColumns"
                :key="col.queryFieldName"
                :value="col.queryFieldName"
                class="cursor-pointer"
              >
                {{ col.queryFieldName }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Heatmap: Value Column -->
        <div class="space-y-1.5" v-if="fields.valueColumn">
          <p class="text-xs font-medium text-muted-foreground">
            Value Column (Numeric)
          </p>
          <Select v-model="valueField" size="xs">
            <SelectTrigger class="w-full cursor-pointer">
              <SelectValue placeholder="Select Value Column" />
            </SelectTrigger>
            <SelectContent class="max-h-60">
              <SelectItem
                v-for="col in activeTabColumns"
                :key="col.queryFieldName"
                :value="col.queryFieldName"
                class="cursor-pointer"
              >
                {{ col.queryFieldName }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <!-- Transform section — schema-driven -->
      <div v-if="fields" class="space-y-2">
        <p class="text-sm font-medium">Transform</p>

        <!-- Aggregation -->
        <div class="space-y-1.5" v-if="fields.aggregation">
          <p class="text-xs font-medium text-muted-foreground">Aggregation</p>
          <Select v-model="aggregation" size="xs">
            <SelectTrigger class="w-full cursor-pointer">
              <SelectValue placeholder="Select Aggregation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="AggregationType.NONE" class="cursor-pointer"
                >None (Raw Rows)</SelectItem
              >
              <SelectItem :value="AggregationType.SUM" class="cursor-pointer"
                >Sum</SelectItem
              >
              <SelectItem :value="AggregationType.AVG" class="cursor-pointer"
                >Average</SelectItem
              >
              <SelectItem :value="AggregationType.COUNT" class="cursor-pointer"
                >Count</SelectItem
              >
              <SelectItem :value="AggregationType.MIN" class="cursor-pointer"
                >Min</SelectItem
              >
              <SelectItem :value="AggregationType.MAX" class="cursor-pointer"
                >Max</SelectItem
              >
            </SelectContent>
          </Select>
        </div>

        <!-- Group By (Legend) -->
        <div class="space-y-1.5" v-if="fields.groupBy">
          <p class="text-xs font-medium text-muted-foreground">
            Group By (Legend)
            <span
              v-if="fields.groupByRequired"
              class="text-amber-500 text-xs ml-1"
              >(Required)</span
            >
          </p>
          <Select v-model="groupByField" size="xs">
            <SelectTrigger class="w-full cursor-pointer">
              <SelectValue placeholder="No Grouping" />
            </SelectTrigger>
            <SelectContent class="max-h-60">
              <SelectItem value="" class="cursor-pointer"
                >No Grouping</SelectItem
              >
              <SelectItem
                v-for="col in activeTabColumns"
                :key="col.queryFieldName"
                :value="col.queryFieldName"
                class="cursor-pointer"
              >
                {{ col.queryFieldName }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Sorting -->
        <div class="space-y-1.5" v-if="fields.sortBy">
          <p class="text-xs font-medium text-muted-foreground">Sorting</p>
          <Select v-model="sortBy" size="xs">
            <SelectTrigger class="w-full cursor-pointer">
              <SelectValue placeholder="No Sorting" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="SortByType.NONE" class="cursor-pointer"
                >No Sorting</SelectItem
              >
              <SelectItem :value="SortByType.X_ASC" class="cursor-pointer"
                >X-Axis (Ascending)</SelectItem
              >
              <SelectItem :value="SortByType.X_DESC" class="cursor-pointer"
                >X-Axis (Descending)</SelectItem
              >
              <SelectItem :value="SortByType.Y_ASC" class="cursor-pointer"
                >Y-Axis (Ascending)</SelectItem
              >
              <SelectItem :value="SortByType.Y_DESC" class="cursor-pointer"
                >Y-Axis (Descending)</SelectItem
              >
            </SelectContent>
          </Select>
        </div>

        <!-- Limit Rows -->
        <div class="space-y-1.5" v-if="fields.limitRows">
          <p class="text-xs font-medium text-muted-foreground">Limit Rows</p>
          <Input
            :model-value="limitRows === null ? '' : limitRows"
            @update:model-value="
              value => {
                const val = String(value);
                limitRows =
                  val === '' ? null : Math.max(1, parseInt(val, 10) || 1);
              }
            "
            size="sm"
            type="number"
            min="1"
            placeholder="All"
          />
        </div>
      </div>

      <!-- Display section — schema-driven -->
      <div v-if="fields" class="space-y-2">
        <p class="text-sm font-medium">Display</p>

        <!-- Show Value Labels -->
        <div class="flex items-center justify-between" v-if="fields.showLabels">
          <div class="flex flex-col gap-0.5">
            <p class="text-xs font-medium text-muted-foreground">
              Show Value Labels
            </p>
            <span class="text-xs text-muted-foreground"
              >Render values directly on series</span
            >
          </div>
          <Switch v-model="showLabels" class="cursor-pointer" />
        </div>

        <!-- Smooth Line (Line & Area only) -->
        <div class="flex items-center justify-between" v-if="fields.smoothLine">
          <div class="flex flex-col gap-0.5">
            <p class="text-xs font-medium text-muted-foreground">Smooth Line</p>
            <span class="text-xs text-muted-foreground"
              >Curved lines instead of straight</span
            >
          </div>
          <Switch v-model="smoothLine" class="cursor-pointer" />
        </div>
      </div>
    </div>
  </div>
</template>
