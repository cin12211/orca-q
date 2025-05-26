<script setup lang="ts">
import { computed } from 'vue';
import { ref } from 'vue';
import { Handle, Position, useVueFlow } from '@vue-flow/core';

const rowHeight = 44;

const props = defineProps<{
  id: string;
  data: {
    value: {
      table: string;
      columns: Array<{
        name: string;
        type: string;
      }>;
      primary_keys: Array<{
        column: string;
      }>;
      foreign_keys: Array<{
        column: string;
      }>;
    };
  };
}>();

const { updateNodeData } = useVueFlow();

const value = computed({
  get: () => props.data,
  set: value => updateNodeData(props.id, { value }),
});

const checkPrimaryKey = (key: string) => {
  // console.log(value.value.primary_keys);
  const primaryKey = value.value.value.primary_keys.map(item => item.column);
  // console.log('primaryKey', primaryKey);
  // console.log('key', key);
  return primaryKey.includes(key);
};
const checkForeignKey = (key: string) => {
  // console.log(value.value.foreign_keys);
  const foreignKey = value.value.value.foreign_keys.map(item => item.column);
  // console.log('foreignKey', foreignKey);
  // console.log('key', key);
  return foreignKey.includes(key);
};
</script>

<template>
  <div>
    <div class="flex flex-col w-96 rounded-md border box-border">
      <div
        class="col-span-full rounded-t-md box-border p-2 p-x-auto bg-indigo-400 flex items-center justify-center"
        :style="{
          height: rowHeight + 'px',
        }"
      >
        <p
          class="select-text cursor-text w-fit text-center nodrag px-2 box-border"
        >
          {{ value.value.table }}
        </p>
      </div>
      <div
        v-for="(r, index) in value.value.columns"
        :key="index + '-' + index"
        class="grid grid-cols-3 nodrag cursor-default"
        :style="{
          height: rowHeight + 'px',
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
              v-if="checkPrimaryKey(r.name)"
              name="hugeicons:key-01"
              class="min-w-4 text-yellow-400"
            />
            <Icon
              v-if="checkForeignKey(r.name)"
              name="hugeicons:key-01"
              class="min-w-4 text-blue-400"
            />
          </div>
          <p
            class="select-text cursor-text w-fit text-center nodrag box-border px-2 truncate"
          >
            {{ r.name }}
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
            {{ r.type }}
          </p>
        </div>
      </div>
    </div>
  </div>
  <!-- 
  <div v-for="(r, index) in value.value.foreign_keys">
    {{ r.column }} -> ? {{ index }} in
    {{ value.value.columns.findIndex(e => e.name === r.column) }}
  </div> -->

  <Handle
    v-for="(r, index) in value.value.foreign_keys"
    type="source"
    :id="r.column"
    :position="Position.Right"
    :connectable="false"
    :style="{
      top:
        (value.value.columns.findIndex(e => e.name === r.column) + 1) * 44 -
        44 / 2 -
        1 +
        44 +
        'px',
      height: '20px',
    }"
  />
  <Handle
    v-for="(r, index) in value.value.primary_keys"
    :id="r.column"
    type="target"
    :position="Position.Left"
    :connectable="false"
  />
</template>

<style></style>
