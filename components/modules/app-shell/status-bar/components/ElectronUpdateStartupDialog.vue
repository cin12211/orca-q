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
  installUpdate,
  restartToApplyUpdate,
  skipVersion,
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
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <!-- T012: Skip this version — leftmost, only on the download prompt (not restart-ready) -->
        <AlertDialogCancel
          v-if="!isRestartPrompt"
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
          {{ isRestartPrompt ? 'Restart now' : 'Download update' }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
