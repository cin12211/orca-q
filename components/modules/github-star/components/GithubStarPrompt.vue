<script setup lang="ts">
import { Button } from '@/components/ui/button';

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  star: [];
  later: [];
  decline: [];
}>();
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="translate-y-2 opacity-0"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="translate-y-2 opacity-0"
  >
    <div
      v-if="open"
      role="dialog"
      aria-labelledby="github-star-prompt-title"
      class="fixed right-4 bottom-10 z-50 w-80 rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg"
    >
      <button
        type="button"
        class="absolute top-2 right-2 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Remind me later"
        @click="emit('later')"
      >
        <Icon name="hugeicons:cancel-01" class="size-4" />
      </button>

      <div class="flex items-start gap-3 pr-5">
        <Icon
          name="hugeicons:star"
          class="mt-0.5 size-5 shrink-0 text-yellow-500"
        />
        <div class="space-y-1">
          <p id="github-star-prompt-title" class="text-sm font-medium">
            Enjoying OrcaQ?
          </p>
          <p class="text-sm text-muted-foreground">
            A star on GitHub helps more people find it.
          </p>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" @click="emit('decline')">
          No thanks
        </Button>
        <Button variant="outline" size="sm" @click="emit('later')">
          Later
        </Button>
        <Button size="sm" @click="emit('star')">
          <Icon name="hugeicons:github" class="size-4" />
          Star
        </Button>
      </div>
    </div>
  </Transition>
</template>
