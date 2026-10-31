<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  RabbitUpdateUserInput,
  RabbitUserDetail,
} from '~/core/types/rabbitmq.types';
import { RABBIT_ADMINISTRATOR_TAG } from '../constants';
import RabbitUserTagsField from './RabbitUserTagsField.vue';

type PasswordMode = 'keep' | 'change' | 'remove';

const props = defineProps<{
  user: RabbitUserDetail;
  isSaving: boolean;
}>();

const emit = defineEmits<{ (e: 'save', value: RabbitUpdateUserInput): void }>();

const open = defineModel<boolean>('open', { required: true });

const tags = ref<string[]>([]);
const passwordMode = ref<PasswordMode>('keep');
const password = ref('');

const isSelf = computed(() => props.user.name === props.user.currentUser.name);
const lockedTags = computed(() =>
  isSelf.value ? [RABBIT_ADMINISTRATOR_TAG] : []
);
const canSubmit = computed(
  () =>
    !props.isSaving &&
    (passwordMode.value !== 'change' || Boolean(password.value))
);

const resetForm = () => {
  tags.value = [...props.user.tags];
  passwordMode.value = 'keep';
  password.value = '';
};

const submit = () => {
  if (!canSubmit.value) return;

  emit('save', {
    name: props.user.name,
    tags: tags.value,
    password: passwordMode.value === 'change' ? password.value : undefined,
    shouldRemovePassword: passwordMode.value === 'remove',
  });
};

watch(open, value => {
  if (value) resetForm();
});
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>Edit user {{ user.name }}</DialogTitle>
        <DialogDescription>
          Change tags or the password. Permissions are edited on the user tab.
        </DialogDescription>
      </DialogHeader>

      <form
        id="rabbit-edit-user-form"
        class="space-y-4"
        autocomplete="off"
        @submit.prevent="submit"
      >
        <RabbitUserTagsField
          v-model="tags"
          id-prefix="rabbit-edit-user"
          :locked-tags="lockedTags"
        />
        <p v-if="isSelf" class="text-xs text-muted-foreground">
          OrcaQ is connected as this user, so the administrator tag stays on.
        </p>

        <div class="space-y-2">
          <Label>Password</Label>
          <RadioGroup v-model="passwordMode" class="grid gap-2 text-sm">
            <label class="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem id="rabbit-edit-password-keep" value="keep" />
              Keep the current password
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem id="rabbit-edit-password-change" value="change" />
              Set a new password
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem id="rabbit-edit-password-remove" value="remove" />
              No password (certificate or external auth only)
            </label>
          </RadioGroup>
          <Input
            v-if="passwordMode === 'change'"
            id="rabbit-edit-user-password"
            v-model="password"
            type="password"
            autocomplete="new-password"
            placeholder="New password"
          />
        </div>
      </form>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" @click="open = false">
          Cancel
        </Button>
        <Button
          type="submit"
          form="rabbit-edit-user-form"
          size="sm"
          :disabled="!canSubmit"
        >
          <Icon
            v-if="isSaving"
            name="hugeicons:loading-03"
            class="size-4 animate-spin"
          />
          Save
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
