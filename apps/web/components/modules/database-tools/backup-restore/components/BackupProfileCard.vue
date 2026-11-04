<script setup lang="ts">
interface Props {
  title: string;
  description: string;
  formats: { format: string; extension: string }[];
  toolHint: string;
  targetName: string;
  /** Label above formats badges. Defaults to "Supported Files". */
  formatsLabel?: string;
}

withDefaults(defineProps<Props>(), {
  formatsLabel: 'Supported Files',
});
</script>

<template>
  <div class="rounded-lg border bg-muted/20 p-4">
    <div class="space-y-4">
      <div>
        <p class="text-sm font-medium">{{ title }}</p>
        <p class="mt-1 text-xs text-muted-foreground">{{ description }}</p>
      </div>

      <div>
        <p class="text-xs text-muted-foreground">{{ formatsLabel }}</p>
        <div class="mt-2 flex flex-wrap gap-2">
          <Badge
            v-for="format in formats"
            :key="format.format"
            variant="outline"
            class="font-normal"
          >
            {{ format.extension }}
          </Badge>
        </div>
      </div>

      <div>
        <p class="text-xs text-muted-foreground">Runtime Tools</p>
        <p class="mt-1 text-sm text-muted-foreground">{{ toolHint }}</p>
      </div>

      <div>
        <p class="text-xs text-muted-foreground">Target</p>
        <p class="mt-1 text-sm font-medium">{{ targetName }}</p>
      </div>
    </div>
  </div>
</template>
