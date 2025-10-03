<script setup lang="ts">
import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  Dialog,
  DialogContent,
} from '#components';
import { DEFAULT_MAX_KEEP_ALIVE } from '~/utils/constants';
import BackReferencedTable from './BackReferencedTable.vue';
import ForwardReferencedTable from './ForwardReferencedTable.vue';

export type PreviewRelationBreadcrumb = {
  id: string;
  type: 'backReferenced' | 'forwardReferenced';
  schemaName: string;
  tableName: string;
  columnName: string;
  recordId: string;

  selectedTab?: string;
};

const emit = defineEmits<{
  (e: 'onBackPreviousBreadcrumbByIndex', index: number): void;
  (e: 'onBackPreviousBreadcrumb'): void;
  (e: 'clearBreadcrumb'): void;
  (
    e: 'onUpdateSelectedTabInBreadcrumb',
    index: number,
    selectedTab: string
  ): void;
  (
    e: 'onOpenBackReferencedTableModal',
    value: {
      id: string;
      tableName: string;
      columnName: string;
      schemaName: string;
    }
  ): void;
  (
    e: 'onOpenForwardReferencedTableModal',
    value: {
      id: string;
      tableName: string;
      columnName: string;
      schemaName: string;
    }
  ): void;
}>();

const props = defineProps<{
  open: boolean;
  breadcrumbs: PreviewRelationBreadcrumb[];
  currentTableName: string;
}>();

const latestBreadcrumb = computed(() =>
  props.breadcrumbs.length
    ? props.breadcrumbs[props.breadcrumbs.length - 1]
    : null
);

const updateSelectedTabInBreadcrumb = (selectedTab: string) => {
  emit(
    'onUpdateSelectedTabInBreadcrumb',
    props.breadcrumbs.length - 1,
    selectedTab
  );
};
</script>

<template>
  <Dialog :open="open" @update:open="$emit('clearBreadcrumb')">
    <DialogContent
      class="w-[98dvw]! max-w-[98dvw]! max-h-[95dvh] h-[95dvh] gap-3 p-3 flex flex-col flex-1 flex-wrap overflow-hidden"
    >
      <DialogHeader>
        <DialogDescription>
          <div class="flex items-center">
            <Button
              @click="$emit('onBackPreviousBreadcrumb')"
              size="iconMd"
              variant="secondary"
            >
              <Icon name="hugeicons:arrow-left-02" class="size-4!" />
            </Button>

            <Breadcrumb>
              <BreadcrumbList class="gap-0.5!">
                <BreadcrumbItem class="hover:cursor-pointer">
                  <BreadcrumbLink @click="emit('clearBreadcrumb')">
                    {{ currentTableName }}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />

                <template v-for="(item, index) in breadcrumbs">
                  <BreadcrumbItem
                    :class="[
                      index !== breadcrumbs.length - 1 &&
                        'hover:cursor-pointer',
                    ]"
                  >
                    <BreadcrumbPage v-if="index === breadcrumbs.length - 1">
                      {{
                        item.type === 'backReferenced'
                          ? item.selectedTab
                          : item.tableName
                      }}
                    </BreadcrumbPage>

                    <BreadcrumbLink
                      v-else
                      @click="emit('onBackPreviousBreadcrumbByIndex', index)"
                    >
                      {{
                        item.type === 'backReferenced'
                          ? item.selectedTab
                          : item.tableName
                      }}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator v-if="index < breadcrumbs.length - 1" />
                </template>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </DialogDescription>
      </DialogHeader>

      <KeepAlive :max="DEFAULT_MAX_KEEP_ALIVE">
        <component
          :is="
            latestBreadcrumb?.type === 'backReferenced'
              ? BackReferencedTable
              : ForwardReferencedTable
          "
          v-if="latestBreadcrumb"
          :key="latestBreadcrumb.id"
          v-bind="{
            columnName: latestBreadcrumb.columnName,
            recordId: latestBreadcrumb.recordId,
            schemaName: latestBreadcrumb.schemaName,
            tableName: latestBreadcrumb.tableName,
            selectedTab: latestBreadcrumb.selectedTab,
          }"
          @onOpenBackReferencedTableModal="
            emit('onOpenBackReferencedTableModal', $event)
          "
          @onOpenForwardReferencedTableModal="
            emit('onOpenForwardReferencedTableModal', $event)
          "
          @update:selected-tab="updateSelectedTabInBreadcrumb"
        />
      </KeepAlive>
    </DialogContent>
  </Dialog>
</template>
