<script setup lang="ts">
import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  Dialog,
  DialogContent,
} from '#components';
import BackReferencedTable from './BackReferencedTable.vue';
import ForwardReferencedTable from './ForwardReferencedTable.vue';

export type PreviewRelationBreadcrumb = {
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

const latestBreadcrumb = computed(() => props.breadcrumbs.at(-1));

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
      class="w-[95dvw]! max-w-[95dvw]! max-h-[90dvh] h-[90dvh] gap-3 p-3 flex flex-col flex-1 flex-wrap overflow-hidden"
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
                <BreadcrumbItem>
                  {{ currentTableName }}
                </BreadcrumbItem>
                <BreadcrumbSeparator />

                <template v-for="(item, index) in breadcrumbs">
                  <BreadcrumbItem>
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

      <BackReferencedTable
        v-if="
          latestBreadcrumb?.type === 'backReferenced' && breadcrumbs.length >= 1
        "
        :column-name="latestBreadcrumb.columnName"
        :record-id="latestBreadcrumb.recordId"
        :schema-name="latestBreadcrumb.schemaName"
        :table-name="latestBreadcrumb.tableName"
        @onOpenBackReferencedTableModal="
          emit('onOpenBackReferencedTableModal', $event)
        "
        @onOpenForwardReferencedTableModal="
          emit('onOpenForwardReferencedTableModal', $event)
        "
        :initSelectedTab="latestBreadcrumb.selectedTab"
        :selected-tab="latestBreadcrumb.selectedTab"
        @update:selected-tab="updateSelectedTabInBreadcrumb"
      />

      <ForwardReferencedTable
        v-if="
          latestBreadcrumb?.type === 'forwardReferenced' &&
          breadcrumbs.length >= 1
        "
        :column-name="latestBreadcrumb.columnName"
        :record-id="latestBreadcrumb.recordId"
        :schema-name="latestBreadcrumb.schemaName"
        :table-name="latestBreadcrumb.tableName"
        @onOpenBackReferencedTableModal="
          emit('onOpenBackReferencedTableModal', $event)
        "
        @onOpenForwardReferencedTableModal="
          emit('onOpenForwardReferencedTableModal', $event)
        "
      />
    </DialogContent>
  </Dialog>
</template>
