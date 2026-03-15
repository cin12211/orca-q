<script setup lang="ts">
const props = defineProps<{
  promptCards: string[];
  threadCount: number;
}>();

const emit = defineEmits<{
  (e: 'prompt', value: string): void;
}>();
</script>

<template>
  <div class="mx-auto my-auto w-full max-w-3xl py-8">
    <div class="rounded-3xl p-5">
      <div class="flex items-start">
        <div class="min-w-0 flex-1">
          <div
            class="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"
          >
            <span
              class="rounded-full bg-muted px-2.5 py-1 font-medium text-foreground"
            >
              Orca Agent
            </span>
            <span>{{ props.threadCount }} saved threads ready to resume</span>
          </div>

          <h2 class="mt-3 text-xl font-medium text-foreground">
            Ask for schema help, query ideas, or result checks.
          </h2>
          <p class="mt-2 max-w-2xl text-sm text-muted-foreground">
            Keep it short. The agent already sees the connected schema and can
            keep working from past conversations.
          </p>
        </div>
      </div>

      <!-- <div class="mt-5 grid gap-3 sm:grid-cols-3">
        <Button v-for="prompt in props.promptCards" :key="prompt" variant="outline" class="h-auto min-h-0 justify-start text-foreground font-normal rounded-2xl px-4 py-3 text-left text-sm whitespace-normal" @click="emit('prompt', prompt)">
          {{ prompt }}
        </Button>
      </div> -->
    </div>
  </div>
</template>
