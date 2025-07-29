<script setup lang="ts">
const props = defineProps(["foobar"]);

console.log(props.foobar);
</script>

<template>
  <div>
    <h1>I am the child view {{ foobar }}</h1>
  </div>
</template>
