<script setup lang="ts">
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  McpConnectionAccess,
  resolveMcpConnectionAccess,
} from '~/core/persist/store-state';
import {
  MCP_ACCESS_LABELS,
  MCP_CONNECTION_ACCESS_OPTIONS,
  MCP_INHERIT_ACCESS,
  type McpWorkspaceOption,
} from '../../constants';
import type { McpSessionDraft } from '../../hooks';
import McpAccessSelect from './McpAccessSelect.vue';

const props = defineProps<{
  open: boolean;
  workspaces: McpWorkspaceOption[];
  initialDraft?: McpSessionDraft | null;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  submit: [draft: McpSessionDraft];
}>();

const name = ref('');
const workspaceAccess = ref<Record<string, McpConnectionAccess>>({});
const connectionAccess = ref<Record<string, McpConnectionAccess>>({});
const expandedWorkspaceIds = ref<Set<string>>(new Set());

const isEditing = computed(() => Boolean(props.initialDraft));

const grantedConnectionCount = computed(() => {
  const draft = {
    workspaceAccess: workspaceAccess.value,
    connectionAccess: connectionAccess.value,
  };
  return props.workspaces
    .flatMap(workspace =>
      workspace.connections.map(connection =>
        resolveMcpConnectionAccess(draft, {
          id: connection.id,
          workspaceId: workspace.id,
        })
      )
    )
    .filter(access => access !== McpConnectionAccess.Off).length;
});

const canSubmit = computed(
  () => name.value.trim().length > 0 && grantedConnectionCount.value > 0
);

function getConnectionOptions(workspaceId: string) {
  const workspaceLevel =
    workspaceAccess.value[workspaceId] ?? McpConnectionAccess.Off;

  return [
    {
      label: `Same as workspace (${MCP_ACCESS_LABELS[workspaceLevel]})`,
      value: MCP_INHERIT_ACCESS,
    },
    ...MCP_CONNECTION_ACCESS_OPTIONS,
  ];
}

function setWorkspaceAccess(workspaceId: string, value: string) {
  workspaceAccess.value = {
    ...workspaceAccess.value,
    [workspaceId]: value as McpConnectionAccess,
  };
}

function setConnectionAccess(connectionId: string, value: string) {
  const next = { ...connectionAccess.value };

  if (value === MCP_INHERIT_ACCESS) {
    delete next[connectionId];
  } else {
    next[connectionId] = value as McpConnectionAccess;
  }

  connectionAccess.value = next;
}

function toggleWorkspace(workspaceId: string) {
  const next = new Set(expandedWorkspaceIds.value);
  if (next.has(workspaceId)) next.delete(workspaceId);
  else next.add(workspaceId);
  expandedWorkspaceIds.value = next;
}

function handleSubmit() {
  if (!canSubmit.value) return;

  emit('submit', {
    name: name.value,
    workspaceAccess: Object.fromEntries(
      Object.entries(workspaceAccess.value).filter(
        ([, access]) => access !== McpConnectionAccess.Off
      )
    ),
    connectionAccess: connectionAccess.value,
  });
}

watch(
  () => props.open,
  isOpen => {
    if (!isOpen) return;

    name.value = props.initialDraft?.name ?? '';
    workspaceAccess.value = { ...(props.initialDraft?.workspaceAccess ?? {}) };
    connectionAccess.value = {
      ...(props.initialDraft?.connectionAccess ?? {}),
    };
    expandedWorkspaceIds.value = new Set(
      props.workspaces
        .filter(workspace =>
          workspace.connections.some(
            connection => connection.id in connectionAccess.value
          )
        )
        .map(workspace => workspace.id)
    );
  },
  { immediate: true }
);
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="border max-w-xl">
      <DialogHeader>
        <DialogTitle>
          {{ isEditing ? 'Edit MCP session' : 'Create MCP session' }}
        </DialogTitle>
        <DialogDescription>
          Choose which workspaces and connections this session can reach and
          what it may do there. A connection set to "Same as workspace" follows
          its workspace.
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
        <div class="flex flex-col gap-1.5">
          <label for="mcp-session-name" class="text-sm">Session name</label>
          <Input
            id="mcp-session-name"
            v-model="name"
            size="sm"
            placeholder="e.g. Claude Code on my laptop"
          />
        </div>

        <div class="flex flex-col gap-2">
          <p class="text-sm">Access</p>

          <p
            v-if="props.workspaces.length === 0"
            class="text-xs text-muted-foreground"
          >
            No workspaces yet.
          </p>

          <div
            v-for="workspace in props.workspaces"
            :key="workspace.id"
            class="rounded-md border"
          >
            <div class="flex items-center justify-between gap-3 px-3 py-1.5">
              <button
                type="button"
                class="flex items-center gap-1.5 min-w-0 cursor-pointer"
                @click="toggleWorkspace(workspace.id)"
              >
                <Icon
                  :name="
                    expandedWorkspaceIds.has(workspace.id)
                      ? 'hugeicons:arrow-down-01'
                      : 'hugeicons:arrow-right-01'
                  "
                  class="size-4! shrink-0"
                />
                <span class="text-sm truncate">{{ workspace.name }}</span>
                <span class="text-xs text-muted-foreground shrink-0">
                  {{ workspace.connections.length }} connections
                </span>
              </button>

              <McpAccessSelect
                :model-value="
                  workspaceAccess[workspace.id] ?? McpConnectionAccess.Off
                "
                :options="MCP_CONNECTION_ACCESS_OPTIONS"
                @update:model-value="setWorkspaceAccess(workspace.id, $event)"
              />
            </div>

            <div
              v-if="expandedWorkspaceIds.has(workspace.id)"
              class="border-t flex flex-col"
            >
              <p
                v-if="workspace.connections.length === 0"
                class="text-xs text-muted-foreground px-8 py-2"
              >
                No connections in this workspace.
              </p>
              <div
                v-for="connection in workspace.connections"
                :key="connection.id"
                class="flex items-center justify-between gap-3 pl-8 pr-3 py-1.5"
              >
                <div class="flex flex-col min-w-0">
                  <span class="text-sm truncate">{{ connection.name }}</span>
                  <span class="text-xs text-muted-foreground">
                    {{ connection.type }}
                  </span>
                </div>
                <McpAccessSelect
                  :model-value="
                    connectionAccess[connection.id] ?? MCP_INHERIT_ACCESS
                  "
                  :options="getConnectionOptions(workspace.id)"
                  @update:model-value="
                    setConnectionAccess(connection.id, $event)
                  "
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter class="items-center">
        <span class="text-xs text-muted-foreground mr-auto">
          {{ grantedConnectionCount }} connections shared
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          @click="emit('update:open', false)"
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          {{ isEditing ? 'Save' : 'Create session' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
