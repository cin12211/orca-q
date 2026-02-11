<script setup lang="ts">
import { cn } from '@/lib/utils';
import { isElectron, isPWA } from '~/core/helpers';

const isAppVersion = computed(() => isElectron() || isPWA());
</script>

<template>
  <div
    :class="
      cn(
        'w-full h-10.5 select-none pr-2 bg-sidebar flex justify-center electron-drag-region'
      )
    "
    v-if="isAppVersion"
  >
    <div class="flex items-center justify-between py-2 px-2">
      <div class="flex items-center space-x-2">
        <Avatar class="rounded-2xl">
          <AvatarImage src="/logo.png" alt="@unovue" />
        </Avatar>

        <p class="text-2xl font-medium">OrcaQ</p>
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

        <p class="text-2xl font-medium">OrcaQ</p>
      </div>

      <!-- <Avatar>
      <AvatarImage src="https://github.com/unovue.png" alt="@unovue" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar> -->
    </div>
    <slot />
  </div>
</template>
