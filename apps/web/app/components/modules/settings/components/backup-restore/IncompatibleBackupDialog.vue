<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { isElectron } from '~/core/helpers/environment';

const props = defineProps<{
  open: boolean;
  unknownMigrations: string[];
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const GITHUB_RELEASES_URL = 'https://github.com/orcaQ/orcaq/releases/latest';

type ElectronUpdaterWindow = Window & {
  electronAPI?: { updater?: { check: () => Promise<unknown> } };
};

const handleUpdateClick = () => {
  const api = (window as ElectronUpdaterWindow).electronAPI?.updater;
  if (isElectron() && api) {
    api.check();
  } else {
    window.open(GITHUB_RELEASES_URL, '_blank', 'noopener,noreferrer');
  }
  emit('update:open', false);
};
</script>

<template>
  <AlertDialog :open="props.open" @update:open="emit('update:open', $event)">
    <AlertDialogContent class="border max-w-md">
      <AlertDialogHeader>
        <div class="flex items-center gap-2 mb-1">
          <Icon
            name="hugeicons:alert-02"
            class="size-5! text-destructive shrink-0"
          />
          <AlertDialogTitle>Backup Not Compatible</AlertDialogTitle>
        </div>
        <AlertDialogDescription class="space-y-3">
          <span>
            This backup was created with a newer version of OrcaQ. Update the
            app to import it.
          </span>

          <div
            v-if="props.unknownMigrations.length > 0"
            class="space-y-1.5 pt-1"
          >
            <p class="text-xs font-medium text-foreground">
              Unknown migrations ({{ props.unknownMigrations.length }}):
            </p>
            <div class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              <Badge
                v-for="migration in props.unknownMigrations"
                :key="migration"
                variant="secondary"
                class="font-mono text-xs"
              >
                {{ migration }}
              </Badge>
            </div>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel class="border" @click="emit('update:open', false)">
          Cancel
        </AlertDialogCancel>
        <Button @click="handleUpdateClick">
          <Icon name="lucide:arrow-up-circle" class="size-4! mr-1.5" />
          Update OrcaQ
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
