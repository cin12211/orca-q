<script setup lang="ts">
import { useMigrationState } from '../../core/composables/useMigrationState';

const { state, isBlocking } = useMigrationState();
</script>

<template>
  <Transition name="migration-fade">
    <div
      v-if="isBlocking"
      class="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-background"
      aria-live="polite"
      aria-label="Đang khởi động ứng dụng"
    >
      <!-- Logo / brand mark -->
      <div class="mb-2 flex items-center gap-2 text-foreground">
        <Icon name="lucide:database" class="size-8!" />
        <span class="text-xl font-semibold tracking-tight">Orca Query</span>
      </div>

      <!-- Spinner -->
      <Icon
        name="lucide:loader-circle"
        class="size-6! animate-spin text-muted-foreground"
      />

      <!-- Status text -->
      <p class="text-sm text-muted-foreground">
        <template v-if="state.phase === 'running' && state.currentStep">
          Migrating
          <span class="font-medium text-foreground">{{
            state.currentStep.collection
          }}</span>
          to v{{ state.currentStep.version }}…
        </template>
        <template v-else> Đang khởi động… </template>
      </p>

      <!-- Progress counter (only shown when actual work is happening) -->
      <p v-if="state.appliedCount > 0" class="text-xs text-muted-foreground/60">
        {{ state.appliedCount }} update{{
          state.appliedCount === 1 ? '' : 's'
        }}
        applied
      </p>
    </div>
  </Transition>
</template>

<style scoped>
.migration-fade-enter-active {
  transition: opacity 0.15s ease;
}
.migration-fade-leave-active {
  transition: opacity 0.4s ease;
}
.migration-fade-enter-from,
.migration-fade-leave-to {
  opacity: 0;
}
</style>
