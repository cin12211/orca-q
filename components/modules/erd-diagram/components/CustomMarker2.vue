<script setup>
defineProps({
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  stroke: {
    type: String,
    required: false,
    default: '#b1b1b7',
  },
  fill: {
    type: String,
    required: false,
    default: '#b1b1b7',
  },
  strokeWidth: {
    type: Number,
    required: false,
    default: 1,
  },
  width: {
    type: Number,
    required: false,
    default: 12.5,
  },
  height: {
    type: Number,
    required: false,
    default: 12.5,
  },
});
</script>

<template>
  <svg
    class="vue-flow__marker vue-flow__container"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Icon from Huge Icons by Hugeicons - undefined -->
    <marker
      :id="id"
      class="vue-flow__arrowhead text-muted-foreground"
      viewBox="0 0 24 24"
      refX="2.5"
      refY="8"
      :markerWidth="width"
      :markerHeight="height"
      markerUnits="strokeWidth"
      orient="0"
    >
      <!-- Icon from Huge Icons by Hugeicons - undefined -->
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M23.2381 1.93974C23.481 1.80822 23.5712 1.50476 23.4396 1.26195C23.3081 1.01914 23.0047 0.928928 22.7619 1.06045L10.7619 7.56045C10.6063 7.64471 10.5068 7.80491 10.5003 7.98171C10.4938 8.15851 10.5817 8.32587 10.7306 8.42134L10.7532 8.43574L10.8193 8.47786C10.8773 8.51474 10.9627 8.5689 11.0728 8.63831C11.293 8.77712 11.6121 8.97693 12.0083 9.22151C12.8004 9.71055 13.9017 10.379 15.1381 11.0967C17.6 12.5258 20.6347 14.172 22.8291 14.97C23.0886 15.0644 23.3755 14.9305 23.4699 14.671C23.5643 14.4115 23.4304 14.1246 23.1709 14.0302C21.0695 13.2661 18.1042 11.6623 15.6401 10.2319C14.5191 9.58119 13.5096 8.97094 12.7436 8.5H23.3333C23.6095 8.5 23.8333 8.27614 23.8333 8C23.8333 7.72386 23.6095 7.5 23.3333 7.5H12.973L23.2381 1.93974ZM11 8.0001L10.7306 8.42134C10.7306 8.42134 10.7302 8.42105 11 8.0001Z"
        fill="currentColor"
      />
      <path
        d="M6.665 13.16C9.24141 13.16 11.33 11.0714 11.33 8.495C11.33 5.91859 9.24141 3.83 6.665 3.83C4.08859 3.83 2 5.91859 2 8.495C2 11.0714 4.08859 13.16 6.665 13.16Z"
        fill="transparent"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.665 4.33C4.36473 4.33 2.5 6.19473 2.5 8.495C2.5 10.7953 4.36473 12.66 6.665 12.66C8.96527 12.66 10.83 10.7953 10.83 8.495C10.83 6.19473 8.96527 4.33 6.665 4.33ZM1.5 8.495C1.5 5.64245 3.81245 3.33 6.665 3.33C9.51755 3.33 11.83 5.64245 11.83 8.495C11.83 11.3476 9.51755 13.66 6.665 13.66C3.81245 13.66 1.5 11.3476 1.5 8.495Z"
        fill="currentColor"
      />
    </marker>
  </svg>
  <!--   <svg class="vue-flow__marker vue-flow__container">
    <defs>
      <marker
        :id="id"
        class="vue-flow__arrowhead"
        viewBox="-10 -10 20 20"
        refX="0"
        refY="0"
        :markerWidth="width"
        :markerHeight="height"
        markerUnits="strokeWidth"
        orient="auto-start-reverse"
      >
        <path
          v-if="type === 'diamond'"
          :style="{
            stroke,
            strokeWidth,
          }"
          stroke-linecap="round"
          stroke-linejoin="round"
          :fill="fill"
          d="M 0,-5 L 5,0 L 0,5 L -5,0 Z"
        />

        <path
          v-if="type === 'circle'"
          :style="{
            stroke,
            strokeWidth,
          }"
          stroke-linecap="round"
          stroke-linejoin="round"
          :fill="fill"
          d="M18 15s-4.419-6-6-6s-6 6-6 6" 
        />

        <path
          v-if="type === 'square'"
          :style="{
            stroke,
            strokeWidth,
          }"
          stroke-linecap="round"
          stroke-linejoin="round"
          :fill="fill"
          d="M -4 -4 H 4 V 4 H -4 Z"
        />

      </marker>
    </defs>
  </svg> -->
</template>
