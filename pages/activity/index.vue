<template>
  <div>
    hello
    <p>Slug: {{ route.params.slug }}</p>
  </div>
</template>

<script setup>
const route = useRoute();
</script>
