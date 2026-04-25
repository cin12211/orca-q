<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useElectronUpdater } from '~/core/composables/useElectronUpdater';

const {
  startupPromptOpen,
  dismissStartupPrompt,
  availableUpdate,
  readyToRestartUpdate,
  isBusy,
  status,
  downloadProgress,
  installUpdate,
  restartToApplyUpdate,
  skipVersion,
  cancelDownload,
} = useElectronUpdater();

const displayUpdate = computed(
  () => readyToRestartUpdate.value ?? availableUpdate.value
);

const isRestartPrompt = computed(() => !!readyToRestartUpdate.value);

const handlePrimaryAction = async () => {
  if (isRestartPrompt.value) {
    await restartToApplyUpdate();
    return;
  }

  await installUpdate();
};
</script>

<template>
  <AlertDialog :open="startupPromptOpen" v-if="startupPromptOpen">
    <AlertDialogContent class="border">
      <AlertDialogHeader>
        <AlertDialogTitle>
          <template v-if="isRestartPrompt">
            Update {{ displayUpdate?.version }} is ready to install
          </template>
          <template v-else>
            Update {{ displayUpdate?.version }} is available
          </template>
        </AlertDialogTitle>

        <AlertDialogDescription class="space-y-2">
          <p>
            <template v-if="isRestartPrompt">
              The update package has finished downloading. Restart now to apply
              version {{ displayUpdate?.version }}.
            </template>
            <template v-else>
              A newer desktop build is available. Current version:
              {{ displayUpdate?.currentVersion }}.
            </template>
          </p>

          <p v-if="displayUpdate?.body" class="whitespace-pre-wrap text-xs">
            {{ displayUpdate.body }}
          </p>

          <!-- T037: In-dialog progress when download is in flight -->
          <div
            v-if="status === 'downloading' && !isRestartPrompt"
            class="flex flex-col gap-1.5 pt-1"
          >
            <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                class="h-full rounded-full bg-green-500 transition-all duration-300"
                :style="{ width: `${downloadProgress}%` }"
              />
            </div>
            <p class="text-xs text-muted-foreground">{{ downloadProgress }}%</p>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <!-- T038: While downloading — "Cancel" (keeps dialog open, resets to available) replaces Skip -->
        <Button
          v-if="status === 'downloading' && !isRestartPrompt"
          type="button"
          variant="outline"
          class="mr-auto"
          @click="cancelDownload()"
        >
          Cancel
        </Button>
        <!-- T012: Skip this version — leftmost, only on the download prompt (not restart-ready, not downloading) -->
        <AlertDialogCancel
          v-else-if="!isRestartPrompt"
          class="text-muted-foreground mr-auto border-0 bg-transparent shadow-none hover:bg-transparent"
          :disabled="isBusy"
          @click="displayUpdate && skipVersion(displayUpdate.version)"
        >
          Skip this version
        </AlertDialogCancel>
        <AlertDialogCancel class="border" @click="dismissStartupPrompt()">
          Later
        </AlertDialogCancel>
        <AlertDialogAction
          class="border"
          :disabled="isBusy"
          @click="handlePrimaryAction"
        >
          {{
            status === 'downloading'
              ? 'Downloading…'
              : isRestartPrompt
                ? 'Restart now'
                : 'Download update'
          }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
