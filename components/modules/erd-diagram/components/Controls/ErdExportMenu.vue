<script setup lang="ts">
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
} from '#components';

defineProps<{
  isExporting?: boolean;
}>();

const emit = defineEmits<{
  (e: 'export-mermaid'): void;
  (e: 'export-json'): void;
  (e: 'export-image'): void;
  (e: 'export-pdf'): void;
}>();
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="iconMd"
        :disabled="isExporting"
        :class="{ 'animate-pulse': isExporting }"
      >
        <Icon name="hugeicons:share-01" class="size-4!" />
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" class="w-44">
      <DropdownMenuLabel class="text-xs text-muted-foreground font-medium">
        Export diagram
      </DropdownMenuLabel>
      <DropdownMenuSeparator />

      <DropdownMenuItem
        class="flex items-center gap-2 cursor-pointer"
        @click="emit('export-mermaid')"
      >
        <Icon name="hugeicons:code" class="size-4 text-purple-500" />
        <span>Mermaid</span>
        <span class="ml-auto text-xs text-muted-foreground">.mmd</span>
      </DropdownMenuItem>

      <DropdownMenuItem
        class="flex items-center gap-2 cursor-pointer"
        @click="emit('export-json')"
      >
        <Icon name="hugeicons:brackets" class="size-4 text-blue-500" />
        <span>JSON</span>
        <span class="ml-auto text-xs text-muted-foreground">.json</span>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuItem
        class="flex items-center gap-2 cursor-pointer"
        @click="emit('export-image')"
      >
        <Icon name="hugeicons:image-01" class="size-4 text-green-500" />
        <span>Image</span>
        <span class="ml-auto text-xs text-muted-foreground">.png</span>
      </DropdownMenuItem>

      <DropdownMenuItem
        class="flex items-center gap-2 cursor-pointer"
        @click="emit('export-pdf')"
      >
        <Icon name="hugeicons:file-pdf" class="size-4 text-red-500" />
        <span>PDF</span>
        <span class="ml-auto text-xs text-muted-foreground">print</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
