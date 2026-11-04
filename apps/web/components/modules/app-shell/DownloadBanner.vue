<script setup lang="ts">
import { isElectron } from '~/core/helpers/environment';
import {
  LocalStorageKey,
  LocalStorageManager,
} from '~/core/persist/LocalStorageManager';

const config = useRuntimeConfig();
const showBannerConfig = computed(() => config.public.showDownloadBanner);

const isBannerDismissed = ref(false);

onMounted(() => {
  isBannerDismissed.value =
    LocalStorageManager.get(LocalStorageKey.DOWNLOAD_BANNER_DISMISSED) ===
    'true';
});

const shouldShow = computed(() => {
  // Only show on Web version, when configured to show, and not dismissed
  return !isElectron() && showBannerConfig.value && !isBannerDismissed.value;
});

const onDismiss = () => {
  LocalStorageManager.set(LocalStorageKey.DOWNLOAD_BANNER_DISMISSED, 'true');
  isBannerDismissed.value = true;
};

const downloadLink = computed(() => config.public.downloadLink);
</script>

<template>
  <div
    v-if="shouldShow"
    class="relative z-50 flex w-full items-center justify-between bg-[#2196F3] px-4 py-2 text-white shadow-sm animate-in fade-in slide-in-from-top duration-500"
  >
    <div class="flex items-center gap-3">
      <div class="flex items-center -space-x-1">
        <Icon name="logos:apple" class="size-4 invert brightness-0" />
        <Icon name="logos:linux-tux" class="size-4" />
      </div>
      <p class="text-xs font-medium sm:text-sm">
        OrcaQ is now available as a Desktop App for Mac and Linux! 🚀
      </p>
    </div>

    <div class="flex items-center gap-4">
      <button
        @click="onDismiss"
        class="text-xs opacity-70 transition-opacity hover:opacity-100 hover:underline"
      >
        Thanks
      </button>

      <Button size="xs" variant="secondary" as-child>
        <a :href="downloadLink" target="_blank">
          <Icon name="hugeicons:download-04" class="size-3.5" />
          Download
        </a>
      </Button>
    </div>
  </div>
</template>
