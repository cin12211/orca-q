<script setup lang="ts">
// TODO: json editor
// https://www.npmjs.com/package/immutable-json-patch
// https://www.npmjs.com/package/json-beautify

definePageMeta({
  keepalive: true,
});
</script>

<template>
  <div class="w-full h-full flex flex-col" id="preview-select-row">
    <!-- <CodeEditor v-model="code" :extensions="extensions" :disabled="false" /> -->
  </div>
</template>
