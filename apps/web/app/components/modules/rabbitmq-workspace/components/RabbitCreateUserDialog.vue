<script setup lang="ts">
import { toast } from 'vue-sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useStrictModeGuard } from '~/components/modules/environment-tag';
import { getBrokerErrorMessage } from '~/components/modules/shared/message-broker';
import type { Connection } from '~/core/stores';
import { RABBIT_FULL_ACCESS_PATTERN } from '../constants';
import { rabbitmqService } from '../services';
import RabbitUserTagsField from './RabbitUserTagsField.vue';

const props = defineProps<{
  connection: Connection;
  vhosts: string[];
}>();

const emit = defineEmits<{ (e: 'created', userName: string): void }>();

const open = defineModel<boolean>('open', { required: true });

const { checkAndConfirm } = useStrictModeGuard();
const name = ref('');
const password = ref('');
const tags = ref<string[]>([]);
const shouldGrantVhost = ref(true);
const vhost = ref('');
const configure = ref(RABBIT_FULL_ACCESS_PATTERN);
const write = ref(RABBIT_FULL_ACCESS_PATTERN);
const read = ref(RABBIT_FULL_ACCESS_PATTERN);
const isSaving = ref(false);

const canSubmit = computed(
  () =>
    Boolean(name.value.trim() && password.value) &&
    (!shouldGrantVhost.value || Boolean(vhost.value)) &&
    !isSaving.value
);

const resetForm = () => {
  name.value = '';
  password.value = '';
  tags.value = [];
  shouldGrantVhost.value = true;
  vhost.value =
    props.connection.broker?.rabbitmq?.vhost &&
    props.vhosts.includes(props.connection.broker.rabbitmq.vhost)
      ? props.connection.broker.rabbitmq.vhost
      : (props.vhosts[0] ?? '');
  configure.value = RABBIT_FULL_ACCESS_PATTERN;
  write.value = RABBIT_FULL_ACCESS_PATTERN;
  read.value = RABBIT_FULL_ACCESS_PATTERN;
};

const submit = async () => {
  if (!canSubmit.value) return;
  if (!(await checkAndConfirm(props.connection))) return;

  const userName = name.value.trim();
  isSaving.value = true;

  try {
    await rabbitmqService.createUser(props.connection, {
      name: userName,
      password: password.value,
      tags: tags.value,
      permission: shouldGrantVhost.value
        ? {
            vhost: vhost.value,
            configure: configure.value,
            write: write.value,
            read: read.value,
          }
        : undefined,
    });
    toast.success(`User "${userName}" created`);
    open.value = false;
    emit('created', userName);
  } catch (error) {
    toast.error('Could not create the user', {
      description: getBrokerErrorMessage(error),
    });
  } finally {
    isSaving.value = false;
  }
};

watch(open, value => {
  if (value) resetForm();
});
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>Add user</DialogTitle>
        <DialogDescription>
          Create a RabbitMQ user on {{ connection.name }}.
        </DialogDescription>
      </DialogHeader>

      <form
        id="rabbit-create-user-form"
        class="space-y-4"
        autocomplete="off"
        @submit.prevent="submit"
      >
        <div class="grid grid-cols-2 gap-2">
          <div class="space-y-1.5">
            <Label for="rabbit-new-user-name">
              Username <span class="text-destructive">*</span>
            </Label>
            <Input id="rabbit-new-user-name" v-model="name" />
          </div>
          <div class="space-y-1.5">
            <Label for="rabbit-new-user-password">
              Password <span class="text-destructive">*</span>
            </Label>
            <Input
              id="rabbit-new-user-password"
              v-model="password"
              type="password"
              autocomplete="new-password"
            />
          </div>
        </div>

        <RabbitUserTagsField v-model="tags" id-prefix="rabbit-new-user" />

        <div class="space-y-2 rounded-lg border p-3">
          <div class="flex items-center gap-2 text-sm">
            <Switch
              id="rabbit-new-user-grant"
              v-model:model-value="shouldGrantVhost"
            />
            <label for="rabbit-new-user-grant" class="cursor-pointer">
              Grant access to a virtual host
            </label>
          </div>

          <template v-if="shouldGrantVhost">
            <Select v-model="vhost">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Choose a virtual host" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="item in vhosts" :key="item" :value="item">
                  {{ item }}
                </SelectItem>
              </SelectContent>
            </Select>
            <div class="grid grid-cols-3 gap-2">
              <div class="space-y-1">
                <Label for="rabbit-new-user-configure" class="text-xs">
                  Configure
                </Label>
                <Input
                  id="rabbit-new-user-configure"
                  v-model="configure"
                  class="font-mono text-xs"
                />
              </div>
              <div class="space-y-1">
                <Label for="rabbit-new-user-write" class="text-xs">Write</Label>
                <Input
                  id="rabbit-new-user-write"
                  v-model="write"
                  class="font-mono text-xs"
                />
              </div>
              <div class="space-y-1">
                <Label for="rabbit-new-user-read" class="text-xs">Read</Label>
                <Input
                  id="rabbit-new-user-read"
                  v-model="read"
                  class="font-mono text-xs"
                />
              </div>
            </div>
            <p class="text-xs text-muted-foreground">
              Regular expressions on queue and exchange names. Leave a field
              empty to deny it, ".*" allows everything.
            </p>
          </template>
        </div>
      </form>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" @click="open = false">
          Cancel
        </Button>
        <Button
          type="submit"
          form="rabbit-create-user-form"
          size="sm"
          :disabled="!canSubmit"
        >
          <Icon
            v-if="isSaving"
            name="hugeicons:loading-03"
            class="size-4 animate-spin"
          />
          Create user
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
