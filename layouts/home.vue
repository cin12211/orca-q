<script setup lang="ts">
const isAppVersion = computed(() => '__TAURI_INTERNALS__' in window);
</script>

<template>
  <div
    class="w-full h-9 select-none border-b pr-2 bg-sidebar-accent flex justify-center"
    data-tauri-drag-region
    v-if="isAppVersion"
  >
    <div
      class="flex items-center justify-between border-b border-border py-2 px-2"
      data-tauri-drag-region
    >
      <div class="flex items-center space-x-2">
        <Avatar class="rounded-2xl">
          <AvatarImage src="/logo.png" alt="@unovue" />
        </Avatar>

        <p class="text-2xl font-medium">HeraQ</p>
      </div>

      <!-- <Avatar>
      <AvatarImage src="https://github.com/unovue.png" alt="@unovue" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar> -->
    </div>
  </div>

  <div class="h-screen overflow-y-auto flex flex-col">
    <div
      v-if="!isAppVersion"
      class="flex items-center justify-between border-b border-border py-2 px-2"
    >
      <div class="flex items-center space-x-2">
        <Avatar class="rounded-2xl">
          <AvatarImage src="/logo.png" alt="@unovue" />
        </Avatar>

        <p class="text-2xl font-medium">HeraQ</p>
      </div>

      <!-- <Avatar>
      <AvatarImage src="https://github.com/unovue.png" alt="@unovue" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar> -->
    </div>
    <slot />
  </div>
</template>
