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
    default: 2,
  },
  width: {
    type: Number,
    required: false,
    default: 24,
  },
  height: {
    type: Number,
    required: false,
    default: 24,
  },
  makerClass: {
    type: String,
    required: false,
    default: '',
  },
});
</script>

<template>
  <svg
    class="vue-flow__marker vue-flow__container"
    xmlns="http://www.w3.org/2000/svg"
  >
    <marker
      :id="id"
      :class="[makerClass, 'vue-flow__arrowhead']"
      viewBox="0 0 24 24"
      refX="2.5"
      refY="8"
      :markerWidth="width"
      :markerHeight="height"
      :markerUnits="strokeWidth"
      orient="180"
    >
      <path
        d="M6.665 12.6601C9.24141 12.6601 11.33 10.5715 11.33 7.99508C11.33 5.41867 9.24141 3.33008 6.665 3.33008C4.08859 3.33008 2 5.41867 2 7.99508C2 10.5715 4.08859 12.6601 6.665 12.6601Z"
        fill="transparent"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.665 3.83008C4.36473 3.83008 2.5 5.69481 2.5 7.99508C2.5 10.2953 4.36473 12.1601 6.665 12.1601C8.96527 12.1601 10.83 10.2953 10.83 7.99508C10.83 5.69481 8.96527 3.83008 6.665 3.83008ZM1.5 7.99508C1.5 5.14253 3.81245 2.83008 6.665 2.83008C9.51755 2.83008 11.83 5.14253 11.83 7.99508C11.83 10.8476 9.51755 13.1601 6.665 13.1601C3.81245 13.1601 1.5 10.8476 1.5 7.99508Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 2.83008C16.2761 2.83008 16.5 3.05394 16.5 3.33008V12.6634C16.5 12.9396 16.2761 13.1634 16 13.1634C15.7239 13.1634 15.5 12.9396 15.5 12.6634V3.33008C15.5 3.05394 15.7239 2.83008 16 2.83008Z"
        fill="currentColor"
      />
      <path d="M23.5 7.5H11V8.5H23.5V7.5Z" fill="currentColor" />
    </marker>
  </svg>
</template>
