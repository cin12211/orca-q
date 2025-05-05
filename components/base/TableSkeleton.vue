<template>
  <div class="space-y-2">
    <!-- Table header skeleton -->
    <div class="flex space-x-2 pb-2">
      <Skeleton class="h-6 w-1/6 rounded" />
      <Skeleton class="h-6 w-1/6 rounded" />
      <Skeleton class="h-6 w-1/6 rounded" />
      <Skeleton class="h-6 w-1/6 rounded" />
      <Skeleton class="h-6 w-1/6 rounded" />
      <Skeleton class="h-6 w-1/6 rounded" />
    </div>

    <!-- Table rows skeleton -->
    <div class="space-y-2">
      <div v-for="i in 20" :key="i" class="flex space-x-2">
        <Skeleton class="h-5 w-1/6 rounded" />
        <Skeleton class="h-5 w-1/6 rounded" />
        <Skeleton class="h-5 w-1/6 rounded" />
        <Skeleton class="h-5 w-1/6 rounded" />
        <Skeleton class="h-5 w-1/6 rounded" />
        <Skeleton class="h-5 w-1/6 rounded" />
      </div>
    </div>
  </div>
</template>
