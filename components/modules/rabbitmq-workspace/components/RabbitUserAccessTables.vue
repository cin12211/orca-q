<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  RabbitTopicPermission,
  RabbitUserPermission,
} from '~/core/types/rabbitmq.types';
import { RABBIT_PERMISSION_DESCRIPTIONS } from '../constants';

defineProps<{
  permissions: RabbitUserPermission[];
  topicPermissions: RabbitTopicPermission[];
  canManage: boolean;
}>();

const emit = defineEmits<{
  (e: 'add-permission'): void;
  (e: 'edit-permission', value: RabbitUserPermission): void;
  (e: 'clear-permission', value: RabbitUserPermission): void;
  (e: 'add-topic-permission'): void;
  (e: 'edit-topic-permission', value: RabbitTopicPermission): void;
  (e: 'clear-topic-permission', value: RabbitTopicPermission): void;
}>();

/** An empty pattern grants nothing; show that explicitly. */
const formatPattern = (pattern: string) => pattern || '(none)';
</script>

<template>
  <section class="space-y-2">
    <div class="flex items-center justify-between gap-2">
      <h3
        class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        Permissions
      </h3>
      <Button
        v-if="canManage"
        size="xxs"
        variant="outline"
        @click="emit('add-permission')"
      >
        <Icon name="hugeicons:add-01" class="size-3.5!" />
        Set permission
      </Button>
    </div>
    <p v-if="!permissions.length" class="text-xs text-muted-foreground">
      This user has no access to any virtual host.
    </p>
    <div v-else class="overflow-auto rounded-lg border">
      <Table class="text-xs">
        <TableHeader>
          <TableRow>
            <TableHead>Virtual host</TableHead>
            <TableHead :title="RABBIT_PERMISSION_DESCRIPTIONS.configure">
              Configure
            </TableHead>
            <TableHead :title="RABBIT_PERMISSION_DESCRIPTIONS.write">
              Write
            </TableHead>
            <TableHead :title="RABBIT_PERMISSION_DESCRIPTIONS.read">
              Read
            </TableHead>
            <TableHead v-if="canManage" class="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="permission in permissions" :key="permission.vhost">
            <TableCell>{{ permission.vhost }}</TableCell>
            <TableCell
              v-for="key in ['configure', 'write', 'read'] as const"
              :key="key"
              class="font-mono"
              :class="!permission[key] && 'text-muted-foreground'"
            >
              {{ formatPattern(permission[key]) }}
            </TableCell>
            <TableCell v-if="canManage" class="text-right whitespace-nowrap">
              <Button
                size="iconSm"
                variant="ghost"
                title="Edit permission"
                @click="emit('edit-permission', permission)"
              >
                <Icon name="hugeicons:pencil-edit-02" class="size-3.5!" />
              </Button>
              <Button
                size="iconSm"
                variant="ghost"
                title="Clear permission"
                @click="emit('clear-permission', permission)"
              >
                <Icon
                  name="hugeicons:delete-02"
                  class="size-3.5! text-destructive"
                />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
    <p class="text-xs text-muted-foreground">
      Each column is a regular expression matched against queue and exchange
      names. Configure: {{ RABBIT_PERMISSION_DESCRIPTIONS.configure }} Write:
      {{ RABBIT_PERMISSION_DESCRIPTIONS.write }} Read:
      {{ RABBIT_PERMISSION_DESCRIPTIONS.read }}
    </p>
  </section>

  <section class="space-y-2">
    <div class="flex items-center justify-between gap-2">
      <h3
        class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        Topic permissions
      </h3>
      <Button
        v-if="canManage"
        size="xxs"
        variant="outline"
        @click="emit('add-topic-permission')"
      >
        <Icon name="hugeicons:add-01" class="size-3.5!" />
        Set topic permission
      </Button>
    </div>
    <p v-if="!topicPermissions.length" class="text-xs text-muted-foreground">
      No topic permissions: routing keys on topic exchanges are not restricted.
    </p>
    <div v-else class="overflow-auto rounded-lg border">
      <Table class="text-xs">
        <TableHeader>
          <TableRow>
            <TableHead>Virtual host</TableHead>
            <TableHead>Exchange</TableHead>
            <TableHead>Write (routing key)</TableHead>
            <TableHead>Read (routing key)</TableHead>
            <TableHead v-if="canManage" class="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="permission in topicPermissions"
            :key="`${permission.vhost}:${permission.exchange}`"
          >
            <TableCell>{{ permission.vhost }}</TableCell>
            <TableCell>{{ permission.exchange }}</TableCell>
            <TableCell
              v-for="key in ['write', 'read'] as const"
              :key="key"
              class="font-mono"
              :class="!permission[key] && 'text-muted-foreground'"
            >
              {{ formatPattern(permission[key]) }}
            </TableCell>
            <TableCell v-if="canManage" class="text-right whitespace-nowrap">
              <Button
                size="iconSm"
                variant="ghost"
                title="Edit topic permission"
                @click="emit('edit-topic-permission', permission)"
              >
                <Icon name="hugeicons:pencil-edit-02" class="size-3.5!" />
              </Button>
              <Button
                size="iconSm"
                variant="ghost"
                title="Clear topic permission"
                @click="emit('clear-topic-permission', permission)"
              >
                <Icon
                  name="hugeicons:delete-02"
                  class="size-3.5! text-destructive"
                />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </section>
</template>
