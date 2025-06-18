<script setup lang="ts">
import { computed } from 'vue';
import { Handle, Position, useVueFlow } from '@vue-flow/core';
import type { DBSchemaProps } from '~/components/modules/erd-diagram/type';

// Constants
const ROW_HEIGHT = 44;
const HANDLE_HEIGHT = '20px';

const props = defineProps<DBSchemaProps>();

const { updateNodeData } = useVueFlow();

const value = computed({
  get: () => props.data,
  set: value => updateNodeData(props.id, { value }),
});

const calculateHandleTop = (column: string) => {
  const index = value.value.value.columns.findIndex(e => e.name === column);
  return (index + 1) * ROW_HEIGHT - ROW_HEIGHT / 2 + ROW_HEIGHT;
};

const checkPrimaryKey = (key: string) => {
  const primaryKey = value.value.value.primary_keys.map(item => item.column);

  return primaryKey.includes(key);
};
const checkForeignKey = (key: string) => {
  const foreignKey = value.value.value.foreign_keys.map(item => item.column);

  return foreignKey.includes(key);
};
</script>

<template>
  <div>
    <div class="flex flex-col w-96 rounded-md border box-border">
      <div
        class="col-span-full rounded-t-md box-border p-2 p-x-auto bg-indigo-400 flex items-center justify-center"
        :style="{
          height: ROW_HEIGHT + 'px',
        }"
      >
        <p
          class="select-text cursor-text w-fit text-center nodrag px-2 box-border"
        >
          {{ value.value.table }}
        </p>
      </div>
      <div
        v-for="(column, index) in value.value.columns"
        :key="index + '-' + index"
        class="grid grid-cols-3 nodrag cursor-default"
        :style="{
          height: ROW_HEIGHT + 'px',
        }"
      >
        <div
          :class="[
            'col-span-2 box-border border py-2 pl-2 nodrag truncate flex items-center gap-1.5',
            index === value.value.columns.length - 1 ? 'rounded-bl-md' : '',
          ]"
        >
          <div class="w-6 box-border flex items-center justify-center">
            <Icon
              v-if="checkPrimaryKey(column.name)"
              name="hugeicons:key-01"
              class="min-w-4 text-yellow-400"
            />
            <Icon
              v-if="checkForeignKey(column.name)"
              name="hugeicons:key-01"
              class="min-w-4 text-blue-400"
            />
          </div>
          <p
            class="select-text cursor-text w-fit text-center nodrag box-border px-2 truncate"
          >
            {{ column.name }}
          </p>
        </div>
        <div
          :class="[
            'col-span-1 box-border py-2 border nodrag truncate',
            index === value.value.columns.length - 1 ? 'rounded-br-md' : '',
          ]"
        >
          <p
            class="select-text cursor-text text-center nodrag box-border px-2 truncate"
          >
            {{ column.type }}
          </p>
        </div>
      </div>
    </div>
  </div>

  <Handle
    v-for="(column, index) in value.value.foreign_keys"
    type="source"
    :id="column.column"
    :position="Position.Right"
    :connectable="false"
    :style="{
      top: calculateHandleTop(column.column),
      height: HANDLE_HEIGHT,
    }"
  />
  <Handle
    v-for="(column, index) in value.value.primary_keys"
    :id="column.column"
    type="target"
    :position="Position.Left"
    :connectable="false"
  />
</template>
