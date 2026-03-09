<script setup lang="ts">
defineProps<{
  sourceId: string;
  url?: string;
  title?: string;
  mediaType?: string;
  filename?: string;
}>();
</script>

<template>
  <div
    class="inline-flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-xs"
  >
    <Icon
      :name="url ? 'hugeicons:link-02' : 'hugeicons:file-02'"
      class="size-3.5 shrink-0 text-muted-foreground"
    />
    <div class="min-w-0 flex-1">
      <a
        v-if="url"
        :href="url"
        target="_blank"
        rel="noopener noreferrer"
        class="truncate font-medium text-primary hover:underline"
      >
        {{ title || url }}
      </a>
      <span v-else class="truncate font-medium text-foreground">
        {{ title || filename || 'Source document' }}
      </span>
      <span v-if="mediaType" class="ml-2 text-[10px] text-muted-foreground">
        {{ mediaType }}
      </span>
    </div>
  </div>
</template>
