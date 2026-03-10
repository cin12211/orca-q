<script setup lang="ts">
import { Icon } from '#components';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useFileDrop } from '~/core/composables/useFileDrop';

const props = defineProps<{
  formData: {
    sshEnabled: boolean;
    sshHost: string;
    sshPort: number;
    sshUsername: string;
    sshPassword: string;
    sshStoreInKeychain: boolean;
    sshUseKey: boolean;
    sshPrivateKey: string;
  };
}>();

const {
  onDragOver: keyDragOver,
  onDragLeave: keyDragLeave,
  onDrop: keyDrop,
  isDragging: keyDragging,
} = useFileDrop(content => {
  props.formData.sshPrivateKey = content;
});
</script>

<template>
  <AccordionItem value="ssh">
    <AccordionTrigger class="hover:no-underline">
      <div class="flex items-center gap-2">
        <Icon name="lucide:terminal" class="size-4 text-primary" />
        <span>SSH Tunnel</span>
      </div>
    </AccordionTrigger>
    <AccordionContent class="space-y-4 pt-4">
      <div class="flex items-center justify-between">
        <Label for="ssh-enabled">Over SSH</Label>
        <Switch id="ssh-enabled" v-model:model-value="formData.sshEnabled" />
      </div>

      <template v-if="formData.sshEnabled">
        <div class="grid grid-cols-4 gap-4">
          <div class="col-span-3 space-y-2">
            <Label for="ssh-host">Server</Label>
            <Input
              id="ssh-host"
              placeholder="e.g. ssh.example.com or 1.2.3.4"
              v-model="formData.sshHost"
            />
          </div>
          <div class="space-y-2">
            <Label for="ssh-port">Port</Label>
            <Input
              id="ssh-port"
              type="number"
              placeholder="22"
              v-model="formData.sshPort"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="ssh-user">User</Label>
            <Input
              id="ssh-user"
              placeholder="e.g. root or ubuntu"
              v-model="formData.sshUsername"
            />
          </div>
          <div class="space-y-2">
            <Label for="ssh-password">Password</Label>
            <Input
              id="ssh-password"
              type="password"
              placeholder="SSH password (optional if using key)"
              v-model="formData.sshPassword"
            />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <Checkbox
            id="ssh-keychain"
            v-model:model-value="formData.sshStoreInKeychain"
          />
          <Label for="ssh-keychain" class="text-sm font-normal"
            >Store in keychain</Label
          >
        </div>

        <div class="space-y-4 pt-2 border-t">
          <div class="flex items-center gap-2">
            <Checkbox
              id="ssh-use-key"
              v-model:model-value="formData.sshUseKey"
            />
            <Label for="ssh-use-key" class="text-sm font-semibold"
              >SSH Key Authentication</Label
            >
          </div>

          <template v-if="formData.sshUseKey">
            <div class="space-y-2">
              <Label for="ssh-key-file">Private Key</Label>
              <Textarea
                id="ssh-key-file"
                v-model="formData.sshPrivateKey"
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----"
                :class="[
                  'min-h-[100px] max-h-[200px] text-xs font-mono',
                  keyDragging ? 'ring-2 ring-primary' : '',
                ]"
                @dragover="keyDragOver"
                @dragleave="keyDragLeave"
                @drop="keyDrop"
              />
            </div>
          </template>
        </div>
      </template>
    </AccordionContent>
  </AccordionItem>
</template>
