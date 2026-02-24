<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#components';
import type {
  CustomLayoutDefinition,
  CustomLayoutInnerSplit,
  CustomLayoutPanel,
  LayoutDirection,
  LayoutSlot,
} from '~/components/modules/raw-query/constants';
import { SLOT_OPTIONS } from '~/components/modules/raw-query/constants';
import LayoutPreview from './LayoutPreview.vue';

// --- Preset templates for quick start ---
const PRESET_TEMPLATES: {
  name: string;
  layout: Omit<CustomLayoutDefinition, 'id' | 'createdAt'>;
}[] = [
  {
    name: 'Vertical',
    layout: {
      name: '',
      direction: 'vertical',
      panels: [
        { slot: 'content', defaultSize: 70, minSize: 30, maxSize: 100 },
        { slot: 'result', defaultSize: 30, minSize: 0, maxSize: 80 },
      ],
      innerSplit: {
        panelIndex: 0,
        direction: 'horizontal',
        panels: [
          { slot: 'content', defaultSize: 70, minSize: 20, maxSize: 100 },
          { slot: 'variables', defaultSize: 30, minSize: 0, maxSize: 70 },
        ],
      },
    },
  },
  {
    name: 'Horizontal',
    layout: {
      name: '',
      direction: 'horizontal',
      panels: [
        { slot: 'content', defaultSize: 50, minSize: 20, maxSize: 100 },
        { slot: 'result', defaultSize: 50, minSize: 0, maxSize: 80 },
      ],
    },
  },
  {
    name: 'Horizontal + Vars',
    layout: {
      name: '',
      direction: 'horizontal',
      panels: [
        { slot: 'content', defaultSize: 60, minSize: 20, maxSize: 100 },
        { slot: 'result', defaultSize: 40, minSize: 0, maxSize: 80 },
      ],
      innerSplit: {
        panelIndex: 0,
        direction: 'vertical',
        panels: [
          { slot: 'content', defaultSize: 70, minSize: 20, maxSize: 100 },
          { slot: 'variables', defaultSize: 30, minSize: 0, maxSize: 70 },
        ],
      },
    },
  },
];

const props = defineProps<{
  open: boolean;
  /** Existing layout to edit (null = create mode) */
  editLayout?: CustomLayoutDefinition | null;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  save: [layout: CustomLayoutDefinition];
}>();

// --- Form state ---
const layoutName = ref('');
const direction = ref<LayoutDirection>('horizontal');
const hasInnerSplit = ref(false);
const innerSplitPanelIndex = ref(0);
const innerSplitDirection = ref<LayoutDirection>('vertical');

const panels = ref<CustomLayoutPanel[]>([
  { slot: 'content', defaultSize: 60, minSize: 20, maxSize: 100 },
  { slot: 'result', defaultSize: 40, minSize: 0, maxSize: 80 },
]);

const innerPanels = ref<CustomLayoutPanel[]>([
  { slot: 'content', defaultSize: 70, minSize: 20, maxSize: 100 },
  { slot: 'variables', defaultSize: 30, minSize: 0, maxSize: 70 },
]);

const isEditMode = computed(() => !!props.editLayout);

// Reset form when dialog opens
watch(
  () => props.open,
  isOpen => {
    if (!isOpen) return;

    if (props.editLayout) {
      // Populate from existing layout
      layoutName.value = props.editLayout.name;
      direction.value = props.editLayout.direction;
      panels.value = structuredClone(toRaw(props.editLayout.panels));
      hasInnerSplit.value = !!props.editLayout.innerSplit;

      if (props.editLayout.innerSplit) {
        innerSplitPanelIndex.value = props.editLayout.innerSplit.panelIndex;
        innerSplitDirection.value = props.editLayout.innerSplit.direction;
        innerPanels.value = structuredClone(
          toRaw(props.editLayout.innerSplit.panels)
        );
      }
    } else {
      // Default to Vertical preset for quick editing
      applyPresetTemplate(0);
    }
  }
);

// --- Preset template application ---
const activePresetIndex = ref(0);

const applyPresetTemplate = (index: number) => {
  const preset = PRESET_TEMPLATES[index];
  if (!preset) return;

  activePresetIndex.value = index;
  layoutName.value = 'My layout';
  direction.value = preset.layout.direction;
  panels.value = structuredClone(preset.layout.panels);
  hasInnerSplit.value = !!preset.layout.innerSplit;

  if (preset.layout.innerSplit) {
    innerSplitPanelIndex.value = preset.layout.innerSplit.panelIndex;
    innerSplitDirection.value = preset.layout.innerSplit.direction;
    innerPanels.value = structuredClone(preset.layout.innerSplit.panels);
  } else {
    innerSplitPanelIndex.value = 0;
    innerSplitDirection.value = 'vertical';
    innerPanels.value = [
      { slot: 'content', defaultSize: 70, minSize: 20, maxSize: 100 },
      { slot: 'variables', defaultSize: 30, minSize: 0, maxSize: 70 },
    ];
  }
};

// --- Panel management ---
const addPanel = () => {
  if (panels.value.length >= 3) return;

  const usedSlots = new Set(panels.value.map(p => p.slot));
  const availableSlot = SLOT_OPTIONS.find(s => !usedSlots.has(s)) || 'content';

  panels.value.push({
    slot: availableSlot,
    defaultSize: 30,
    minSize: 0,
    maxSize: 100,
  });

  normalizeSizes(panels.value);
};

const removePanel = (index: number) => {
  if (panels.value.length <= 2) return;

  panels.value.splice(index, 1);
  normalizeSizes(panels.value);

  // Reset inner split if its panel was removed
  if (
    hasInnerSplit.value &&
    innerSplitPanelIndex.value >= panels.value.length
  ) {
    innerSplitPanelIndex.value = 0;
  }
};

const addInnerPanel = () => {
  if (innerPanels.value.length >= 3) return;

  const usedSlots = new Set(innerPanels.value.map(p => p.slot));
  const availableSlot = SLOT_OPTIONS.find(s => !usedSlots.has(s)) || 'content';

  innerPanels.value.push({
    slot: availableSlot,
    defaultSize: 30,
    minSize: 0,
    maxSize: 100,
  });

  normalizeSizes(innerPanels.value);
};

const removeInnerPanel = (index: number) => {
  if (innerPanels.value.length <= 2) return;

  innerPanels.value.splice(index, 1);
  normalizeSizes(innerPanels.value);
};

/** Normalize sizes so they sum to 100 */
const normalizeSizes = (targetPanels: CustomLayoutPanel[]) => {
  const total = targetPanels.reduce((sum, p) => sum + p.defaultSize, 0);
  if (total === 0) return;

  const scale = 100 / total;
  targetPanels.forEach(p => {
    p.defaultSize = Math.round(p.defaultSize * scale);
  });

  // Fix rounding error on the last panel
  const newTotal = targetPanels.reduce((sum, p) => sum + p.defaultSize, 0);
  if (newTotal !== 100 && targetPanels.length > 0) {
    targetPanels[targetPanels.length - 1].defaultSize += 100 - newTotal;
  }
};

// --- Drag & Drop ---
const dragIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);
const dragGroup = ref<'panels' | 'inner' | null>(null);

const onDragStart = (index: number, group: 'panels' | 'inner') => {
  dragIndex.value = index;
  dragGroup.value = group;
};

const onDragOver = (e: DragEvent, index: number) => {
  e.preventDefault();
  dragOverIndex.value = index;
};

const onDragLeave = () => {
  dragOverIndex.value = null;
};

const onDragEnd = () => {
  dragIndex.value = null;
  dragOverIndex.value = null;
  dragGroup.value = null;
};

const onDrop = (targetIndex: number, group: 'panels' | 'inner') => {
  if (dragIndex.value === null || dragGroup.value !== group) return;
  if (dragIndex.value === targetIndex) return;

  const targetList = group === 'panels' ? panels.value : innerPanels.value;
  const [moved] = targetList.splice(dragIndex.value, 1);
  targetList.splice(targetIndex, 0, moved);

  onDragEnd();
};

// --- Live preview ---
const previewLayout = computed<CustomLayoutDefinition>(() => {
  const base: CustomLayoutDefinition = {
    id: props.editLayout?.id ?? 'preview',
    name: layoutName.value || 'Preview',
    direction: direction.value,
    panels: panels.value,
    createdAt: props.editLayout?.createdAt ?? Date.now(),
  };

  if (hasInnerSplit.value) {
    base.innerSplit = {
      panelIndex: innerSplitPanelIndex.value,
      direction: innerSplitDirection.value,
      panels: innerPanels.value,
    };
  }

  return base;
});

// --- Validation ---
const isValid = computed(() => {
  return !!layoutName.value.trim();
});

const validationHint = computed(() => {
  if (!layoutName.value.trim()) return 'Name is required';

  const totalSize = panels.value.reduce((sum, p) => sum + p.defaultSize, 0);
  if (totalSize !== 100)
    return `Panel sizes total ${totalSize}% — will be auto-adjusted to 100%`;

  if (hasInnerSplit.value) {
    const innerTotal = innerPanels.value.reduce(
      (sum, p) => sum + p.defaultSize,
      0
    );
    if (innerTotal !== 100)
      return `Inner panel sizes total ${innerTotal}% — will be auto-adjusted to 100%`;
  }

  return '';
});

// --- Save ---
const onSave = () => {
  if (!isValid.value) return;

  // Auto-normalize sizes so they always total 100%
  normalizeSizes(panels.value);
  if (hasInnerSplit.value) {
    normalizeSizes(innerPanels.value);
  }

  const innerSplit: CustomLayoutInnerSplit | undefined = hasInnerSplit.value
    ? {
        panelIndex: innerSplitPanelIndex.value,
        direction: innerSplitDirection.value,
        panels: structuredClone(toRaw(innerPanels.value)),
      }
    : undefined;

  const layout: CustomLayoutDefinition = {
    id: props.editLayout?.id ?? crypto.randomUUID(),
    name: layoutName.value.trim(),
    direction: direction.value,
    panels: structuredClone(toRaw(panels.value)),
    innerSplit,
    createdAt: props.editLayout?.createdAt ?? Date.now(),
  };

  emit('save', layout);
  emit('update:open', false);
};

const onCancel = () => {
  emit('update:open', false);
};

const availableSlots = (
  currentSlot: LayoutSlot,
  allPanels: CustomLayoutPanel[]
): LayoutSlot[] => {
  const usedSlots = new Set(allPanels.map(p => p.slot));
  return SLOT_OPTIONS.filter(s => s === currentSlot || !usedSlots.has(s));
};
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-3xl! w-3xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {{ isEditMode ? 'Edit Layout' : 'Create Layout' }}
        </DialogTitle>
      </DialogHeader>

      <div class="flex flex-col gap-4 py-2">
        <!-- Name -->
        <div class="flex flex-col gap-1.5">
          <Label for="layout-name" class="text-sm font-medium">Name</Label>
          <Input
            id="layout-name"
            v-model="layoutName"
            placeholder="e.g. My Custom Layout"
            class="h-8"
          />
        </div>

        <!-- Direction -->
        <div class="flex flex-col gap-1.5">
          <Label class="text-sm font-medium">Direction</Label>
          <div class="flex gap-2">
            <Button
              size="sm"
              :variant="direction === 'horizontal' ? 'default' : 'outline'"
              @click="direction = 'horizontal'"
              class="cursor-pointer"
            >
              <Icon
                name="hugeicons:distribute-horizontal-center"
                class="size-4! mr-1"
              />
              Horizontal
            </Button>
            <Button
              size="sm"
              :variant="direction === 'vertical' ? 'default' : 'outline'"
              @click="direction = 'vertical'"
              class="cursor-pointer"
            >
              <Icon
                name="hugeicons:distribute-vertical-center"
                class="size-4! mr-1"
              />
              Vertical
            </Button>
          </div>
        </div>

        <!-- Panels -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <Label class="text-sm font-medium">Panels</Label>
            <Button
              v-if="panels.length < 3"
              size="xs"
              variant="outline"
              @click="addPanel"
              class="cursor-pointer h-6"
            >
              <Icon name="hugeicons:add-01" class="size-3! mr-0.5" />
              Add
            </Button>
          </div>

          <div
            v-for="(panel, idx) in panels"
            :key="idx"
            draggable="true"
            @dragstart="onDragStart(idx, 'panels')"
            @dragover="onDragOver($event, idx)"
            @dragleave="onDragLeave"
            @drop="onDrop(idx, 'panels')"
            @dragend="onDragEnd"
            class="flex items-center gap-2 p-2 border rounded-md bg-accent/30 transition-all"
            :class="{
              'opacity-50': dragGroup === 'panels' && dragIndex === idx,
              'ring-2 ring-primary/50':
                dragGroup === 'panels' &&
                dragOverIndex === idx &&
                dragIndex !== idx,
            }"
          >
            <Icon
              name="hugeicons:drag-drop-vertical"
              class="size-4! text-muted-foreground cursor-grab shrink-0"
            />

            <Select
              :modelValue="panel.slot"
              @update:modelValue="panel.slot = $event as LayoutSlot"
            >
              <SelectTrigger size="sm" class="h-7! w-28 cursor-pointer text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="slot in availableSlots(panel.slot, panels)"
                  :key="slot"
                  :value="slot"
                  class="cursor-pointer text-xs"
                >
                  {{ slot }}
                </SelectItem>
              </SelectContent>
            </Select>

            <div class="flex-1 flex items-center gap-2">
              <span class="text-xs text-muted-foreground w-8">
                {{ panel.defaultSize }}%
              </span>
              <Slider
                :modelValue="[panel.defaultSize]"
                @update:modelValue="
                  panel.defaultSize = $event?.[0] ?? panel.defaultSize
                "
                :min="0"
                :max="100"
                :step="5"
                class="flex-1"
              />
            </div>

            <Button
              v-if="panels.length > 2"
              size="xs"
              variant="ghost"
              @click="removePanel(idx)"
              class="cursor-pointer h-6 w-6 p-0"
            >
              <Icon name="hugeicons:delete-02" class="size-3.5!" />
            </Button>
          </div>

          <p
            v-if="panels.reduce((s, p) => s + p.defaultSize, 0) !== 100"
            class="text-xs text-destructive"
          >
            Panel sizes must total 100% (currently
            {{ panels.reduce((s, p) => s + p.defaultSize, 0) }}%)
          </p>
        </div>

        <!-- Inner Split Toggle -->
        <div class="flex items-center justify-between">
          <div>
            <Label class="text-sm font-medium">Inner Split</Label>
            <p class="text-xs text-muted-foreground">
              Nest panels inside one of the top-level panels
            </p>
          </div>
          <Switch v-model="hasInnerSplit" class="cursor-pointer" />
        </div>

        <!-- Inner Split Config -->
        <div
          v-if="hasInnerSplit"
          class="flex flex-col gap-2 pl-3 border-l-2 border-primary/30"
        >
          <div class="flex items-center gap-2">
            <Label class="text-xs font-medium whitespace-nowrap"
              >Split panel</Label
            >
            <Select
              :modelValue="String(innerSplitPanelIndex)"
              @update:modelValue="innerSplitPanelIndex = Number($event)"
            >
              <SelectTrigger size="sm" class="h-7! w-28 cursor-pointer text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="(panel, idx) in panels"
                  :key="idx"
                  :value="String(idx)"
                  class="cursor-pointer text-xs"
                >
                  Panel {{ idx + 1 }} ({{ panel.slot }})
                </SelectItem>
              </SelectContent>
            </Select>

            <div class="flex gap-1 ml-auto">
              <Button
                size="xs"
                :variant="
                  innerSplitDirection === 'horizontal' ? 'default' : 'outline'
                "
                @click="innerSplitDirection = 'horizontal'"
                class="cursor-pointer h-6 text-xs"
              >
                H
              </Button>
              <Button
                size="xs"
                :variant="
                  innerSplitDirection === 'vertical' ? 'default' : 'outline'
                "
                @click="innerSplitDirection = 'vertical'"
                class="cursor-pointer h-6 text-xs"
              >
                V
              </Button>
            </div>
          </div>

          <div
            v-for="(innerPanel, iIdx) in innerPanels"
            :key="iIdx"
            draggable="true"
            @dragstart="onDragStart(iIdx, 'inner')"
            @dragover="onDragOver($event, iIdx)"
            @dragleave="onDragLeave"
            @drop="onDrop(iIdx, 'inner')"
            @dragend="onDragEnd"
            class="flex items-center gap-2 p-2 border rounded-md bg-accent/20 transition-all"
            :class="{
              'opacity-50': dragGroup === 'inner' && dragIndex === iIdx,
              'ring-2 ring-primary/50':
                dragGroup === 'inner' &&
                dragOverIndex === iIdx &&
                dragIndex !== iIdx,
            }"
          >
            <Icon
              name="hugeicons:drag-drop-vertical"
              class="size-4! text-muted-foreground cursor-grab shrink-0"
            />

            <Select
              :modelValue="innerPanel.slot"
              @update:modelValue="innerPanel.slot = $event as LayoutSlot"
            >
              <SelectTrigger size="sm" class="h-7! w-28 cursor-pointer text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="slot in availableSlots(innerPanel.slot, innerPanels)"
                  :key="slot"
                  :value="slot"
                  class="cursor-pointer text-xs"
                >
                  {{ slot }}
                </SelectItem>
              </SelectContent>
            </Select>

            <div class="flex-1 flex items-center gap-2">
              <span class="text-xs text-muted-foreground w-8">
                {{ innerPanel.defaultSize }}%
              </span>
              <Slider
                :modelValue="[innerPanel.defaultSize]"
                @update:modelValue="
                  innerPanel.defaultSize = $event?.[0] ?? innerPanel.defaultSize
                "
                :min="0"
                :max="100"
                :step="5"
                class="flex-1"
              />
            </div>

            <Button
              v-if="innerPanels.length > 2"
              size="xs"
              variant="ghost"
              @click="removeInnerPanel(iIdx)"
              class="cursor-pointer h-6 w-6 p-0"
            >
              <Icon
                name="hugeicons:delete-02"
                class="size-3.5! text-destructive"
              />
            </Button>
          </div>

          <Button
            v-if="innerPanels.length < 3"
            size="xs"
            variant="outline"
            @click="addInnerPanel"
            class="cursor-pointer h-6 self-start"
          >
            <Icon name="hugeicons:add-01" class="size-3! mr-0.5" />
            Add Inner Panel
          </Button>
        </div>

        <!-- Live Preview -->
        <div class="flex flex-col gap-1.5">
          <Label class="text-sm font-medium">Preview</Label>
          <LayoutPreview :layout="previewLayout" class="!h-60" />
        </div>
      </div>

      <DialogFooter class="flex items-center gap-2">
        <p v-if="validationHint" class="text-xs text-muted-foreground mr-auto">
          {{ validationHint }}
        </p>
        <Button variant="outline" @click="onCancel" class="cursor-pointer">
          Cancel
        </Button>
        <Button :disabled="!isValid" @click="onSave" class="cursor-pointer">
          {{ isEditMode ? 'Update' : 'Create' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
