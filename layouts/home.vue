<script setup lang="ts">
import { cn } from '@/lib/utils';
import { isElectron, isPWA } from '~/core/helpers';

const isAppVersion = computed(() => isElectron() || isPWA());
const config = useRuntimeConfig();
const ggFormLink = config.public.ggFormLink;
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

      <div>
        <Button variant="outline" size="sm" as-child>
          <NuxtLink to="https://github.com/cin12211/orca-q" target="_blank">
            <Icon name="hugeicons:github" class="w-5 h-5" /> Star us on GitHub
            ⭐️
          </NuxtLink>
        </Button>
      </div>
      <!-- <Avatar>
      <AvatarImage src="https://github.com/unovue.png" alt="@unovue" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar> -->

      <Button class="fixed bottom-4 right-4 z-10" variant="secondary">
        <NuxtLink :to="ggFormLink" target="_blank">
          <Icon name="hugeicons:chat-feedback-01" /> Give me Feedback
        </NuxtLink>
      </Button>
    </div>

    <slot />
  </div>
</template>
