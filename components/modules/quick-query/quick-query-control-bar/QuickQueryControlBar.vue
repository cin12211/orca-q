<script setup lang="ts">
import { Icon, Tooltip, TooltipContent, TooltipTrigger } from '#components';
import { useSettingsModal } from '~/core/contexts/useSettingsModal';
import { useAppLayoutStore } from '~/core/stores/appLayoutStore';
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
      <Tooltip>
        <TooltipTrigger as-child>
          <Button variant="outline" size="xxs" @click="emit('onShowFilter')">
            <Icon name="lucide:filter"> </Icon>
            <ContextMenuShortcut>⌘F</ContextMenuShortcut>
            <!-- Filter -->
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Filter data</p>
        </TooltipContent>
      </Tooltip>

      <RefreshButton @on-refresh="emit('onRefresh')" />

      <!-- TODO: Open when doing good ux -->
      <Button
        v-if="false"
        variant="outline"
        size="xxs"
        class="text-xs"
        @click="emit('onAddEmptyRow')"
      >
        <Icon name="lucide:plus" class="text-sm"> </Icon>
        Row
      </Button>

      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="outline"
            size="xxs"
            @click="emit('onToggleHistoryPanel')"
          >
            <Icon name="lucide:terminal"> </Icon>
            <ContextMenuShortcut>⌘j</ContextMenuShortcut>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>History logs</p>
        </TooltipContent>
      </Tooltip>

      <p class="font-normal text-xs text-primary/60" v-if="totalSelectedRows">
        Selected
      </p>
      <p class="font-normal text-sm text-primary" v-if="totalSelectedRows">
        {{ totalSelectedRows }}
      </p>

      <Tooltip v-if="hasEditedRows && !isViewVirtualTable">
        <TooltipTrigger as-child>
          <Button variant="outline" size="xxs" @click="emit('onSaveData')">
            <Icon name="lucide:save"> </Icon>
            <ContextMenuShortcut>⌘S</ContextMenuShortcut>
            <!-- Save -->
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Save changes</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip v-if="totalSelectedRows && !isViewVirtualTable">
        <TooltipTrigger as-child>
          <Button variant="outline" size="xxs" @click="emit('onDeleteRows')">
            <Icon name="lucide:trash"> </Icon>
            <ContextMenuShortcut>⌥⌘⌫</ContextMenuShortcut>
            <!-- Delete -->
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Delete selected rows</p>
        </TooltipContent>
      </Tooltip>

      <!-- TODO: Config export to excel or csv -->
      <!-- <Button variant="outline" size="iconSm" class="h-6">
        <Icon name="hugeicons:file-download"> </Icon>
      </Button> -->
    </div>
    <div v-else></div>

    <div class="flex items-center gap-2" v-if="isDataView">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="outline"
            size="iconSm"
            :disabled="!isAllowPreviousPage"
            @click="emit('onPreviousPage')"
          >
            <Icon name="lucide:chevron-left"> </Icon>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Previous page</p>
        </TooltipContent>
      </Tooltip>

      <div class="font-normal text-sm text-primary/80">
        {{ offset + 1 }}-{{ offset + currentTotalRows }}
        <p class="font-normal text-xs text-primary/60 inline">of</p>
        {{ totalRows }}
        <p class="font-normal text-xs text-primary/60 inline">rows</p>
      </div>

      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="outline"
            size="iconSm"
            :disabled="!isAllowNextPage"
            @click="emit('onNextPage')"
          >
            <Icon name="lucide:chevron-right"> </Icon>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Next page</p>
        </TooltipContent>
      </Tooltip>

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
