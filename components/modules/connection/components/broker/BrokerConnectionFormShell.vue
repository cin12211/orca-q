<script setup lang="ts">
import { Icon } from '#components';
import { EnvTagPicker } from '@/components/modules/environment-tag';
import { Button } from '@/components/ui/button';
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ConnectionStatusSection from '../ConnectionStatusSection.vue';

const props = defineProps<{
  title: string;
  description: string;
  isEditing: boolean;
  isFormValid: boolean;
  testStatus: 'idle' | 'testing' | 'success' | 'error';
  errorMessage?: string;
  errorHint?: string;
  errorDetail?: string;
}>();

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'test'): void;
  (e: 'submit'): void;
}>();

const connectionName = defineModel<string>('connectionName', {
  required: true,
});
const tagIds = defineModel<string[]>('tagIds', { required: true });

const statusSectionRef = ref<HTMLElement | null>(null);

// The status sits below the fold on small windows; bring the result into view.
watch(
  () => props.testStatus,
  status => {
    if (status !== 'success' && status !== 'error') return;

    nextTick(() => {
      statusSectionRef.value?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }
);
</script>

<template>
  <form
    class="flex flex-col h-full overflow-hidden"
    @submit.prevent="isFormValid && testStatus !== 'testing' && emit('submit')"
  >
    <DialogHeader class="p-6 pb-2">
      <DialogTitle>{{ title }}</DialogTitle>
      <DialogDescription>{{ description }}</DialogDescription>
    </DialogHeader>

    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <div class="grid grid-cols-3 gap-3">
        <div class="col-span-2 space-y-2">
          <Label for="broker-connection-name" class="flex items-center gap-2">
            <Icon
              name="hugeicons:database"
              class="h-3.5 w-3.5 text-muted-foreground"
            />
            Connection Name <span class="text-destructive">*</span>
          </Label>
          <Input id="broker-connection-name" v-model="connectionName" />
        </div>
        <div class="col-span-1 space-y-2">
          <Label class="flex items-center gap-2">
            <Icon
              name="hugeicons:tag-01"
              class="h-3.5 w-3.5 text-muted-foreground"
            />
            Environment Tags
          </Label>
          <EnvTagPicker v-model="tagIds" />
        </div>
      </div>

      <slot />

      <div ref="statusSectionRef">
        <ConnectionStatusSection
          :test-status="testStatus"
          :error-message="errorMessage"
          :error-hint="errorHint"
          :error-detail="errorDetail"
        />
      </div>
    </div>

    <DialogFooter
      class="p-6 pt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:space-x-2"
    >
      <Button type="button" variant="outline" size="sm" @click="emit('back')">
        <Icon name="hugeicons:arrow-left-02" />
        Back
      </Button>
      <div class="flex space-x-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          :disabled="testStatus === 'testing' || !isFormValid"
          @click="emit('test')"
        >
          <Icon
            v-if="testStatus === 'testing'"
            name="hugeicons:loading-03"
            class="mr-2 size-4 animate-spin"
          />
          Test
        </Button>
        <Button
          type="submit"
          size="sm"
          :disabled="testStatus === 'testing' || !isFormValid"
        >
          {{ isEditing ? 'Update' : 'Create' }}
        </Button>
      </div>
    </DialogFooter>
  </form>
</template>
