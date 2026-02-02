<script setup lang="ts">
import { Icon, Tooltip, TooltipContent, TooltipTrigger } from '#components';
import { useSettingsModal } from '~/shared/contexts/useSettingsModal';
import { useAppLayoutStore } from '~/shared/stores/appLayoutStore';
import { QuickQueryTabView } from '../constants';
import QuickPagination from './QuickPagination.vue';
import RefreshButton from './RefreshButton.vue';

const appLayoutStore = useAppLayoutStore();
const { openSettings } = useSettingsModal();

const props = defineProps<{
  isAllowNextPage: boolean;
  isAllowPreviousPage: boolean;
  totalRows: number;
  limit: number;
  offset: number;
  currentTotalRows: number;
  totalSelectedRows: number;
  hasEditedRows: boolean;
  tabView: QuickQueryTabView;
  isViewVirtualTable?: boolean;
}>();

const emit = defineEmits<{
  (e: 'onRefresh'): void;
  (e: 'onPaginate', value: { limit: number; offset: number }): void;
  (e: 'onNextPage'): void;
  (e: 'onPreviousPage'): void;
  (e: 'onShowFilter'): void;
  (e: 'onSaveData'): void;
  (e: 'onAddEmptyRow'): void;
  (e: 'onDeleteRows'): void;
  (e: 'onToggleHistoryPanel'): void;
  (e: 'update:tabView', value: QuickQueryTabView): void;
}>();

const quickQueryControlBarRef = ref<HTMLElement>();

const isDataView = computed(() => {
  return props.tabView === QuickQueryTabView.Data;
});
</script>

<template>
  <div
    ref="quickQueryControlBarRef"
    :class="['w-full select-none h-9 flex items-center justify-between']"
  >
    <!-- TODO: review to sort button position for each function-->
    <div class="flex items-center gap-1" v-auto-animate v-if="isDataView">
      <Button
        variant="outline"
        size="sm"
        class="h-6 px-1 gap-1"
        @click="emit('onShowFilter')"
      >
        <Icon name="lucide:filter"> </Icon>
        <ContextMenuShortcut>⌘F</ContextMenuShortcut>
        <!-- Filter -->
      </Button>

      <RefreshButton @on-refresh="emit('onRefresh')" />

      <!-- TODO: Open when doing good ux -->
      <Button
        v-if="false"
        variant="outline"
        size="sm"
        class="h-6 px-1 gap-1 text-xs"
        @click="emit('onAddEmptyRow')"
      >
        <Icon name="lucide:plus" class="text-sm"> </Icon>
        Row
      </Button>

      <Button
        variant="outline"
        size="sm"
        class="h-6 px-1 gap-1"
        @click="emit('onToggleHistoryPanel')"
      >
        <Icon name="lucide:terminal"> </Icon>
        <ContextMenuShortcut>⌘j</ContextMenuShortcut>
      </Button>

      <p class="font-normal text-xs text-primary/60" v-if="totalSelectedRows">
        Selected
      </p>
      <p class="font-normal text-sm text-primary" v-if="totalSelectedRows">
        {{ totalSelectedRows }}
      </p>

      <Button
        variant="outline"
        size="sm"
        class="h-6 px-1 gap-1"
        v-if="hasEditedRows && !isViewVirtualTable"
        @click="emit('onSaveData')"
      >
        <Icon name="lucide:save"> </Icon>
        <ContextMenuShortcut>⌘S</ContextMenuShortcut>
        <!-- Save -->
      </Button>

      <Button
        variant="outline"
        size="sm"
        class="h-6 px-1 gap-1 mr-1"
        v-if="totalSelectedRows && !isViewVirtualTable"
        @click="emit('onDeleteRows')"
      >
        <Icon name="lucide:trash"> </Icon>
        <ContextMenuShortcut>⌥⌘⌫</ContextMenuShortcut>
        <!-- Delete -->
      </Button>

      <!-- TODO: Config export to excel or csv -->
      <!-- <Button variant="outline" size="iconSm" class="h-6">
        <Icon name="hugeicons:file-download"> </Icon>
      </Button> -->
    </div>
    <div v-else></div>

    <div class="flex items-center gap-2" v-if="isDataView">
      <Button
        variant="outline"
        size="iconSm"
        class="h-6"
        :disabled="!isAllowPreviousPage"
        @click="emit('onPreviousPage')"
      >
        <Icon name="lucide:chevron-left"> </Icon>
      </Button>

      <div class="font-normal text-sm text-primary/80">
        {{ offset + 1 }}-{{ offset + currentTotalRows }}
        <p class="font-normal text-xs text-primary/60 inline">of</p>
        {{ totalRows }}
        <p class="font-normal text-xs text-primary/60 inline">rows</p>
      </div>

      <Button
        variant="outline"
        size="iconSm"
        class="h-6"
        :disabled="!isAllowNextPage"
        @click="emit('onNextPage')"
      >
        <Icon name="lucide:chevron-right"> </Icon>
      </Button>

      <QuickPagination
        :limit="limit"
        :offset="offset"
        :totalRows="totalRows"
        @onPaginate="value => emit('onPaginate', value)"
      />
    </div>
    <div v-else></div>

    <div class="flex items-center gap-2">
      <Tabs
        :model-value="tabView"
        @update:model-value="
          $emit('update:tabView', $event as QuickQueryTabView)
        "
      >
        <TabsList class="grid w-full grid-cols-3 h-[1.625rem]!">
          <TabsTrigger
            :value="QuickQueryTabView.Data"
            class="h-5! px-1 font-medium text-xs cursor-pointer text-primary/80"
          >
            Data
          </TabsTrigger>
          <TabsTrigger
            :value="QuickQueryTabView.Structure"
            class="h-5! px-1 font-medium text-xs cursor-pointer text-primary/80"
          >
            Structure
          </TabsTrigger>
          <TabsTrigger
            :value="QuickQueryTabView.Erd"
            class="h-5! px-1 font-medium text-xs cursor-pointer text-primary/80"
            :disabled="isViewVirtualTable"
          >
            ERD
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <!-- Safe Mode Status Icon -->
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            size="iconSm"
            class="h-6 w-6"
            @click="openSettings('Quick Query')"
          >
            <Icon
              v-if="appLayoutStore.quickQuerySafeModeEnabled"
              name="lucide:shield-check"
              class="size-4!"
            />
            <Icon
              v-else
              name="lucide:shield-minus"
              class="size-4! text-muted-foreground"
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            Safe Mode:
            {{
              appLayoutStore.quickQuerySafeModeEnabled ? 'Enabled' : 'Disabled'
            }}
          </p>
          <p class="text-xs text-muted-foreground">Click to configure</p>
        </TooltipContent>
      </Tooltip>
    </div>
  </div>
</template>
