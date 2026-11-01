<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

defineProps<{ directory: string }>();

const emit = defineEmits<{
  (e: 'pick-directory'): void;
}>();

const fileName = defineModel<string>('fileName', { required: true });
</script>

<template>
  <div class="space-y-2">
    <Label for="database-file-name">File name</Label>
    <Input
      id="database-file-name"
      data-testid="create-database-file-name"
      placeholder="analytics"
      v-model="fileName"
    />
  </div>

  <div class="space-y-2">
    <Label for="database-file-directory">Location</Label>
    <div class="flex gap-2">
      <Input
        id="database-file-directory"
        data-testid="create-database-file-directory"
        placeholder="Choose a folder"
        readonly
        :model-value="directory"
      />
      <Button
        data-testid="create-database-file-browse"
        type="button"
        variant="outline"
        @click="emit('pick-directory')"
      >
        Browse
      </Button>
    </div>
  </div>
</template>
