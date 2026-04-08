<script setup lang="ts">
import { cn } from '@/lib/utils';
import { isDesktopApp, isMacOS, isPWA, isElectron } from '~/core/helpers';

const isAppVersion = computed(() => isDesktopApp() || isPWA());
const isDesktopMacWindow = computed(() => isDesktopApp() && isMacOS());

const onTitleBarDoubleClick = async () => {
  if (!isDesktopMacWindow.value) {
    return;
  }

  if (isElectron()) {
    await (window as any).electronAPI.window.maximize();
  }
};
</script>

<template>
  <div
    :class="cn('w-full h-10.5 select-none pr-2 bg-sidebar flex justify-center')"
    v-if="isAppVersion"
    @dblclick="onTitleBarDoubleClick"
  >
    <div
      :class="[
        'flex w-full items-center gap-3 py-2 pr-2',
        isDesktopMacWindow ? 'pl-[4.75rem]' : 'pl-3',
      ]"
      :data-electron-drag-region="isElectron() ? '' : undefined"
    >
      <div class="flex items-center space-x-2 pointer-events-none">
        <Avatar class="rounded-2xl">
          <AvatarImage src="/logo.png" alt="@unovue" />
        </Avatar>

        <p class="text-xl font-medium">orcaq</p>
      </div>
      {{ 'show 1.0.53 → 1.0.54' }}
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

        <p class="text-2xl font-medium">orcaq</p>
      </div>

      <!-- <Avatar>
      <AvatarImage src="https://github.com/unovue.png" alt="@unovue" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar> -->
    </div>
    <slot />
  </div>
</template>
