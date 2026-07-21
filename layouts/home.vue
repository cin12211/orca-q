<script setup lang="ts">
import { cn } from '@/lib/utils';
import ElectronUpdateIndicator from '~/components/modules/app-shell/status-bar/components/ElectronUpdateIndicator.vue';
import { useSettingsModal } from '~/core/contexts/useSettingsModal';
import { isDesktopApp, isMacOS, isPWA, isElectron } from '~/core/helpers';

const isDesktopMacWindow = computed(() => isDesktopApp() && isMacOS());
const config = useRuntimeConfig();

const onTitleBarDoubleClick = async () => {
  if (!isDesktopMacWindow.value) {
    return;
  }

  if (isElectron()) {
    await (window as any).electronAPI.window.maximize();
  }
};

const isAppVersion = computed(() => isElectron() || isPWA());
const githubLink = config.public.githubLink;
const discordLink = config.public.discordLink;
const donateLink = config.public.donateLink;

const { openSettings } = useSettingsModal();
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
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <div class="flex items-center space-x-2 pointer-events-none">
          <Avatar class="rounded-md!">
            <AvatarImage src="/logo.png" alt="@unovue" />
          </Avatar>

          <p class="text-xl font-medium">orcaq</p>
        </div>
        <span class="text-sm text-muted-foreground">
          v{{ config.public.version }}
        </span>

        <ElectronUpdateIndicator side="bottom" align="end" />
      </div>

      <div class="window-no-drag flex shrink-0 items-center gap-1">
        <div class="flex items-center gap-1">
          <Button variant="ghost" size="xxs" as-child>
            <a :href="donateLink" target="_blank">
              <Icon name="hugeicons:coffee-01" class="w-3.5 h-3.5" />
              Buy me a coffee
            </a>
          </Button>
          <Button variant="ghost" size="xxs" as-child>
            <a :href="discordLink" target="_blank">
              <Icon name="hugeicons:discord" class="w-3.5 h-3.5" /> Discord
            </a>
          </Button>
          <Button variant="ghost" size="xxs" as-child>
            <a :href="githubLink" target="_blank">
              <Icon name="hugeicons:github" class="w-3.5 h-3.5" /> GitHub ⭐️
            </a>
          </Button>
          <Button variant="ghost" size="xxs" @click="openSettings()">
            <Icon name="hugeicons:settings-01" class="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  </div>

  <div class="h-full overflow-y-auto flex flex-col">
    <div
      v-if="!isAppVersion"
      class="flex items-center justify-between border-b border-border py-2 px-2"
    >
      <div class="flex items-center space-x-2">
        <Avatar class="rounded-md!">
          <AvatarImage src="/logo.png" alt="@unovue" />
        </Avatar>

        <p class="text-2xl font-medium">orcaq</p>
      </div>

      <div class="flex items-center gap-1">
        <Button variant="ghost" size="xxs" as-child>
          <a :href="donateLink" target="_blank">
            <Icon name="hugeicons:coffee-01" class="w-3.5 h-3.5" />
            Buy me a coffee
          </a>
        </Button>
        <Button variant="ghost" size="xxs" as-child>
          <a :href="discordLink" target="_blank">
            <Icon name="hugeicons:discord" class="w-3.5 h-3.5" /> Discord
          </a>
        </Button>
        <Button variant="ghost" size="xxs" as-child>
          <a :href="githubLink" target="_blank">
            <Icon name="hugeicons:github" class="w-3.5 h-3.5" /> GitHub ⭐️
          </a>
        </Button>
        <Button variant="ghost" size="xxs" @click="openSettings()">
          <Icon name="hugeicons:settings-01" class="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="xxs" @click="openSettings()">
          <Icon name="hugeicons:settings-01" class="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>

    <slot />
  </div>
</template>
