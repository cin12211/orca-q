<script setup lang="ts">
defineProps<{
  typeLabel: string;
  sizeLabel: string;
  lengthLabel: string;
  encodingLabel: string;
  ttlCurrentLabel: string;
  ttlError?: string;
  canEdit?: boolean;
  canUpdateTtl?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update-ttl'): void;
}>();

const ttlInput = defineModel<string>('ttlInput', { default: '' });
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <Badge variant="outline" class="h-6 px-2 text-[11px] font-normal">
      {{ typeLabel }}
    </Badge>

    <Badge variant="outline" class="h-6 px-2 text-[11px] font-normal">
      Size {{ sizeLabel }}
    </Badge>
    <Badge variant="outline" class="h-6 px-2 text-[11px] font-normal">
      Length {{ lengthLabel }}
    </Badge>
    <Badge variant="outline" class="h-6 px-2 text-[11px] font-normal">
      Encoding {{ encodingLabel }}
    </Badge>

    <div class="ml-auto flex items-center gap-1.5">
      <span class="text-[11px] text-muted-foreground">
        Current: {{ ttlCurrentLabel }}
      </span>
      <Input
        id="redis-ttl-input"
        size="sm"
        class="h-6 w-28 text-[11px]"
        :model-value="ttlInput"
        :disabled="!canEdit"
        placeholder="TTL (seconds)"
        aria-label="TTL seconds"
        @update:model-value="ttlInput = String($event || '')"
      />
      <Button
        variant="outline"
        size="xs"
        class="h-6 px-2 text-[11px]"
        :disabled="!canUpdateTtl"
        @click="emit('update-ttl')"
      >
        Update TTL
      </Button>
    </div>

    <p v-if="ttlError" class="w-full text-xs text-destructive">
      {{ ttlError }}
    </p>
  </div>
</template>
