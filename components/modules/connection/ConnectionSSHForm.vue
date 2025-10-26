<script setup lang="ts">
import { GlobeIcon, ServerIcon } from 'lucide-vue-next';
import type {
  SSHConnection,
  SSHTunnelConfig,
} from '~/shared/services/useConnectionStore';

defineProps<{
  ssh: Partial<SSHTunnelConfig>;
  formData: Partial<SSHConnection>;
  defaultPort: string;
}>();
</script>

<template>
  <div class="rounded-md border p-3">
    <div class="mb-3 flex items-center gap-2">
      <ServerIcon class="h-4 w-4 text-muted-foreground" />
      <span class="text-sm font-medium">SSH Settings</span>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <Label>SSH Host</Label>
        <Input v-model="ssh.sshHost" placeholder="ssh.example.com" />
      </div>
      <div class="space-y-2">
        <Label>Port</Label>
        <Input v-model="ssh.sshPort" placeholder="22" />
      </div>
      <div class="space-y-2">
        <Label>Username</Label>
        <Input v-model="ssh.sshUser" placeholder="ubuntu" />
      </div>
      <div class="space-y-2">
        <Label>Password (optional)</Label>
        <Input v-model="ssh.sshPassword" type="password" />
      </div>
      <div class="col-span-2 space-y-2">
        <Label>Private Key (PEM) — optional</Label>
        <Textarea
          v-model="ssh.sshPrivateKey"
          rows="3"
          placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
          class="font-mono text-xs"
        />
      </div>
      <div class="space-y-2">
        <Label>Passphrase (if any)</Label>
        <Input v-model="ssh.sshPassphrase" type="password" />
      </div>
    </div>
  </div>

  <div class="rounded-md border p-3">
    <div class="mb-3 flex items-center gap-2">
      <GlobeIcon class="h-4 w-4 text-muted-foreground" />
      <span class="text-sm font-medium">Target Database (behind SSH)</span>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <Label>Host</Label>
        <Input v-model="formData.host" placeholder="127.0.0.1" />
      </div>
      <div class="space-y-2">
        <Label>Port</Label>
        <Input v-model="formData.port" :placeholder="defaultPort || 'port'" />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-4 mt-3">
      <div class="space-y-2">
        <Label>Username</Label>
        <Input v-model="formData.username" />
      </div>
      <div class="space-y-2">
        <Label>Password</Label>
        <Input v-model="formData.password" type="password" />
      </div>
    </div>
    <div class="space-y-2 mt-3">
      <Label>Database</Label>
      <Input v-model="formData.database" />
    </div>
  </div>
</template>
