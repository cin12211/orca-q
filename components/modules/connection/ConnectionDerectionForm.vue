<script setup lang="ts">
import {
  FileTextIcon,
  GlobeIcon,
  HashIcon,
  KeyIcon,
  UserIcon,
} from 'lucide-vue-next';
import type { DirectConnection } from '~/shared/services/useConnectionStore';

defineProps<{
  formData: Partial<DirectConnection>;
  defaultPort: string;
}>();
</script>
<template>
  <div class="grid grid-cols-2 gap-2">
    <div class="space-y-2">
      <Label for="host" class="flex items-center gap-2">
        <GlobeIcon class="h-3.5 w-3.5 text-muted-foreground" />
        Host
      </Label>
      <Input id="host" v-model="formData.host" placeholder="localhost" />
    </div>
    <div class="space-y-2">
      <Label for="port" class="flex items-center gap-2">
        <HashIcon class="h-3.5 w-3.5 text-muted-foreground" />
        Port
      </Label>
      <Input
        id="port"
        v-model="formData.port"
        :placeholder="defaultPort || 'port'"
      />
    </div>
  </div>
  <div class="space-y-2">
    <Label for="username" class="flex items-center gap-2">
      <UserIcon class="h-3.5 w-3.5 text-muted-foreground" />
      Username
    </Label>
    <Input id="username" v-model="formData.username" placeholder="username" />
  </div>
  <div class="space-y-2">
    <Label for="password" class="flex items-center gap-2">
      <KeyIcon class="h-3.5 w-3.5 text-muted-foreground" />
      Password
    </Label>
    <Input id="password" type="password" v-model="formData.password" />
  </div>
  <div class="space-y-2">
    <Label for="database" class="flex items-center gap-2">
      <FileTextIcon class="h-3.5 w-3.5 text-muted-foreground" />
      Database Name
    </Label>
    <Input
      id="database"
      v-model="formData.database"
      placeholder="my_database"
    />
  </div>
</template>
