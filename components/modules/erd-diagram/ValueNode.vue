<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import type { TableMetadata } from '~/server/api/get-tables';
import { HANDLE_HEIGHT, ROW_HEIGHT } from './constants';

const props = defineProps<
  {
    id: string;
  } & TableMetadata
>();

const checkPrimaryKey = (key: string) => {
  const primaryKey = props.primary_keys.map(item => item.column);

  return primaryKey.includes(key);
};
const checkForeignKey = (key: string) => {
  const foreignKey = props.foreign_keys.map(item => item.column);

  return foreignKey.includes(key);
};

const calculateTop = (column: string) => {
  return (
    (props.columns.findIndex(e => e.name === column) + 1) * ROW_HEIGHT -
    ROW_HEIGHT / 2 -
    1 +
    2 +
    10 +
    ROW_HEIGHT
  );
};
</script>

<template>
  <div>
    <div class="flex flex-col w-96 rounded-md border box-border">
      <div
        class="col-span-full rounded-t-md box-border p-2 p-x-auto bg-primary/90 flex items-center justify-center"
        :style="{
          height: ROW_HEIGHT + 10 + 'px',
        }"
      >
        <p class="w-fit text-center px-2 box-border text-white text-xl">
          {{ table }}
        </p>
      </div>
      <div
        v-for="({ name, type, nullable }, index) in columns"
        :key="name"
        class="grid grid-cols-3"
        :style="{
          height: ROW_HEIGHT + 'px',
        }"
      >
        <div
          :class="[
            'col-span-2 box-border border border-r-0 border-t-0 py-2 pl-2 truncate flex items-center gap-1.5',
            index === columns.length - 1 ? 'rounded-bl-md' : '',
          ]"
        >
          <div class="w-6 box-border flex items-center justify-center">
            <Icon
              v-if="checkPrimaryKey(name)"
              name="hugeicons:key-01"
              class="w-4 text-yellow-400 text-xl"
            />
            <Icon
              v-else-if="checkForeignKey(name)"
              name="hugeicons:key-01"
              class="min-w-4 text-gray-400 text-xl"
            />
            <Icon
              v-else-if="nullable"
              name="hugeicons:diamond"
              class="min-w-4 text-gray-300"
            />
            <Icon
              v-else
              name="mynaui:diamond-solid"
              class="min-w-4 text-gray-300"
            />
          </div>
          <p class="w-fit text-center box-border truncate">
            {{ name }}
          </p>
        </div>
        <div
          :class="[
            'col-span-1 box-border py-2 border border-l-0 border-t-0 truncate',
            index === columns.length - 1 ? 'rounded-br-md' : '',
          ]"
        >
          <p class="text-center box-border px-2 truncate text-muted-foreground">
            {{ type }}
          </p>
        </div>
      </div>
    </div>
  </div>

  <Handle
    v-for="({ column }, index) in foreign_keys"
    type="source"
    :id="column"
    :position="Position.Left"
    :connectable="false"
    :style="{
      top: calculateTop(column) + 'px',
      left: '-26px',
      height: HANDLE_HEIGHT,
      opacity: 0,
    }"
  />
  <Handle
    v-for="({ column }, index) in primary_keys"
    :id="column"
    type="target"
    :position="Position.Right"
    :connectable="false"
    :style="{
      top: calculateTop(column) + 'px',
      right: '-26px',
      height: HANDLE_HEIGHT,
      opacity: 0,
    }"
  />
</template>
