<script setup lang="ts">
import { computed } from 'vue';
import { ref } from 'vue';
import { Handle, Position, useVueFlow } from '@vue-flow/core';
import type { TableMetadata } from '~/server/api/get-tables';
import { ROW_HEIGHT } from './constants';

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
    (props.columns.findIndex(e => e.name === column) + 1) * 44 - 44 / 2 - 1 + 44
  );
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
          {{ table }}
        </p>
      </div>
      <div
        v-for="({ name, type }, index) in columns"
        :key="name"
        class="grid grid-cols-3 nodrag cursor-default"
        :style="{
          height: ROW_HEIGHT + 'px',
        }"
      >
        <div
          :class="[
            'col-span-2 box-border border py-2 pl-2 nodrag truncate flex items-center gap-1.5',
            index === columns.length - 1 ? 'rounded-bl-md' : '',
          ]"
        >
          <div class="w-6 box-border flex items-center justify-center">
            <Icon
              v-if="checkPrimaryKey(name)"
              name="hugeicons:key-01"
              class="min-w-4 text-yellow-400"
            />
            <Icon
              v-if="checkForeignKey(name)"
              name="hugeicons:key-01"
              class="min-w-4 text-blue-400"
            />
          </div>
          <p
            class="select-text cursor-text w-fit text-center nodrag box-border px-2 truncate"
          >
            {{ name }}
          </p>
        </div>
        <div
          :class="[
            'col-span-1 box-border py-2 border nodrag truncate',
            index === columns.length - 1 ? 'rounded-br-md' : '',
          ]"
        >
          <p
            class="select-text cursor-text text-center nodrag box-border px-2 truncate"
          >
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
    :position="Position.Right"
    :connectable="false"
    :style="{
      top: calculateTop(column) + 'px',
      height: '20px',
    }"
  />
  <Handle
    v-for="({ column }, index) in primary_keys"
    :id="column"
    type="target"
    :position="Position.Left"
    :connectable="false"
    :style="{
      top: calculateTop(column) + 'px',
      height: '20px',
    }"
  />
</template>
