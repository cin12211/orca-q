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
    selectedTab: string,
    schemaName: string
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
  connectionId: string;
  workspaceId: string;
  rootSchemaName: string;
}>();

const latestBreadcrumb = computed(() =>
  props.breadcrumbs.length
    ? props.breadcrumbs[props.breadcrumbs.length - 1]
    : null
);

const updateSelectedTabInBreadcrumb = (
  selectedTab: string,
  schemaName: string
) => {
  emit(
    'onUpdateSelectedTabInBreadcrumb',
    props.breadcrumbs.length - 1,
    selectedTab,
    schemaName
  );
};

const mappingBreadcrumbName = (breadcrumb: PreviewRelationBreadcrumb) => {
  if (breadcrumb.type === 'backReferenced') {
    if (props.rootSchemaName === breadcrumb.schemaName) {
      return breadcrumb.selectedTab;
    }

    return `${breadcrumb.schemaName}.${breadcrumb.selectedTab}`;
  }

  return `${breadcrumb.schemaName}.${breadcrumb.tableName}`;
};
</script>

<template>
  <Dialog :open="open" @update:open="$emit('clearBreadcrumb')">
    <DialogContent
      class="w-[98dvw]! max-w-[98dvw]! max-h-[95dvh] h-[95dvh] gap-1 p-3 flex flex-col flex-1 flex-wrap overflow-hidden"
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
                      {{ mappingBreadcrumbName(item) }}
                    </BreadcrumbPage>

                    <BreadcrumbLink
                      v-else
                      @click="emit('onBackPreviousBreadcrumbByIndex', index)"
                    >
                      {{ mappingBreadcrumbName(item) }}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator v-if="index < breadcrumbs.length - 1" />
                </template>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </DialogDescription>
      </DialogHeader>

      <KeepAlive>
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
            connectionId: props.connectionId,
            workspaceId: props.workspaceId,
            rootSchemaName: props.rootSchemaName,
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
