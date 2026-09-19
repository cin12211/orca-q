<script setup lang="ts">
interface Props {
  selectedFile: File | null;
  accept: string;
  extensionSummary: string;
}

interface Emits {
  (e: 'change', event: Event): void;
  (e: 'clear'): void;
}

defineProps<Props>();
defineEmits<Emits>();

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
</script>

<template>
  <div>
    <Label class="text-sm font-medium">Backup File</Label>
    <div
      class="relative mt-2 cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:border-primary/50"
    >
      <input
        type="file"
        :accept="accept"
        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        @change="$emit('change', $event)"
      />
      <div
        v-if="!selectedFile"
        class="text-muted-foreground pointer-events-none"
      >
        <Icon
          name="hugeicons:upload-cloud-01"
          class="size-10 mx-auto mb-2 opacity-50"
        />
        <p class="text-sm font-medium">Click to select a file</p>
        <p class="text-xs mt-1">Supports {{ extensionSummary }} backups</p>
      </div>
      <div v-else class="flex items-center justify-center gap-3">
        <Icon name="hugeicons:file-01" class="size-8 text-primary" />
        <div class="text-left">
          <p class="text-sm font-medium">{{ selectedFile.name }}</p>
          <p class="text-xs text-muted-foreground">
            {{ formatFileSize(selectedFile.size) }}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          class="ml-2 relative z-10"
          type="button"
          @click.stop="$emit('clear')"
        >
          <Icon name="hugeicons:x-close" class="size-4" />
        </Button>
      </div>
    </div>
  </div>
</template>
