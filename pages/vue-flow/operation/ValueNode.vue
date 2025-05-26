<script setup>
import { computed } from 'vue';
import { ref } from 'vue';
import { Handle, Position, useVueFlow } from '@vue-flow/core';

const props = defineProps(['id', 'data']);

const tableData = ref([
  {
    table_name: 'user',
    fields: [
      { id: 'string' },
      { nameaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa: 'string' },
      { age: 'number' },
      { email: 'string' },
      { is_active: 'boolean' },
    ],
  },
  {
    table_name: 'profile',
    fields: [
      { id: 'string' },
      { user_id: 'string' },
      { avatar: 'string' },
      { bio: 'string' },
      { phone: 'string' },
      { address: 'string' },
    ],
  },
]);

const rows = computed(() =>
  tableData.value.flatMap(t =>
    t.fields.map(f => {
      const [key, type] = Object.entries(f)[0]; // ← key & type
      return { table: t.table_name, key, type };
    })
  )
);

const { updateNodeData } = useVueFlow();

const value = computed({
  get: () => props.data.value,
  set: value => updateNodeData(props.id, { value }),
});
</script>

<template>
  <!-- <input :id="`${id}-input`" v-model="value" type="number" class="nodrag" /> -->
  <div>
    <div class="flex flex-col w-96 rounded-md border">
      <div
        class="col-span-full rounded-t-md p-2 p-x-auto bg-indigo-400 flex items-center justify-center"
      >
        <p class="select-text cursor-text w-fit text-center nodrag px-2">
          Table
        </p>
      </div>

      <div
        v-for="(r, index) in rows"
        :key="r.table + '-' + r.key"
        class="grid grid-cols-3 nodrag cursor-default select-text"
      >
        <div
          :class="[
            'col-span-2  border p-2 nodrag cursor-text truncate',
            index === rows.length - 1 ? 'rounded-bl-md' : '',
          ]"
        >

          <Icon name="hugeicons:key-01"  />
          {{ r.key }}
        </div>
        <div
          :class="[
            'col-span-1 p-2 border   nodrag select-text cursor-text',
            index === rows.length - 1 ? 'rounded-br-md' : '',
          ]"
        >
          {{ r.type }}
        </div>
      </div>
    </div>
  </div>

  <Handle type="source" :position="Position.Right" :connectable="false" />
</template>

<style></style>
