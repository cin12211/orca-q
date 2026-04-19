<script setup lang="ts">
import { cn } from '@/lib/utils';
import { isDesktopApp, isMacOS, isPWA, isElectron } from '~/core/helpers';

const isDesktopMacWindow = computed(() => isDesktopApp() && isMacOS());

const onTitleBarDoubleClick = async () => {
  if (!isDesktopMacWindow.value) {
    return;
  }

  if (isElectron()) {
    await (window as any).electronAPI.window.maximize();
  }
};

const isAppVersion = computed(() => isElectron() || isPWA());
const config = useRuntimeConfig();
const ggFormLink = config.public.ggFormLink;
const githubLink = config.public.githubLink;
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
      {{ 'show 1.0.60 → 1.0.61' }}
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

      <div>
        <Button variant="outline" size="sm" as-child>
          <a :href="githubLink" target="_blank">
            <Icon name="hugeicons:github" class="w-5 h-5" /> Star us on GitHub
            ⭐️
          </a>
        </Button>
      </div>
      <!-- <Avatar>
      <AvatarImage src="https://github.com/unovue.png" alt="@unovue" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar> -->

      <Button class="fixed bottom-4 right-4 z-10" variant="secondary">
        <a :href="ggFormLink" target="_blank">
          <Icon name="hugeicons:chat-feedback-01" /> Give me Feedback
        </a>
      </Button>
    </div>

    <slot />
  </div>
</template>
