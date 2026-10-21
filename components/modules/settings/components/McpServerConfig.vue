<script setup lang="ts">
import { Switch } from '#components';
import { toast } from 'vue-sonner';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_WORKSPACE_ICON } from '~/core/constants/workspace-icon-constants';
import { copyToClipboard } from '~/core/helpers/copyData';
import {
  McpConnectionAccess,
  resolveMcpConnectionAccess,
  type McpSession,
} from '~/core/persist/store-state';
import { useAppConfigStore } from '~/core/stores/appConfigStore';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { useWorkspacesStore } from '~/core/stores/useWorkspacesStore';
import { MCP_ENDPOINT_PATH, type McpWorkspaceOption } from '../constants';
import { useMcpSessions, type McpSessionDraft } from '../hooks';
import {
  McpSessionDialog,
  McpSessionTokenDialog,
  McpTokenField,
} from './mcp-server';

const appConfigStore = useAppConfigStore();
const connectionStore = useManagementConnectionStore();
const workspacesStore = useWorkspacesStore();
const {
  sessions,
  createSession,
  updateSession,
  regenerateToken,
  deleteSession,
} = useMcpSessions();

const isSessionDialogOpen = ref(false);
const editingSessionId = ref<string | null>(null);
const setupSessionId = ref<string | null>(null);

const endpointUrl = computed(
  () => `${window.location.origin}${MCP_ENDPOINT_PATH}`
);

const workspaceOptions = computed<McpWorkspaceOption[]>(() =>
  workspacesStore.workspaces.map(workspace => ({
    id: workspace.id,
    name: workspace.name,
    icon: workspace.icon || DEFAULT_WORKSPACE_ICON,
    connections: connectionStore.connections
      .filter(connection => connection.workspaceId === workspace.id)
      .map(connection => ({
        id: connection.id,
        name: connection.name,
        type: connection.type,
      })),
  }))
);

const editingDraft = computed<McpSessionDraft | null>(() => {
  const session = sessions.value.find(
    item => item.id === editingSessionId.value
  );
  if (!session) return null;

  return {
    name: session.name,
    requireToken: session.requireToken,
    workspaceAccess: session.workspaceAccess,
    connectionAccess: session.connectionAccess,
  };
});

const tokenlessSessionName = computed(
  () =>
    sessions.value.find(
      session => !session.requireToken && session.id !== editingSessionId.value
    )?.name ?? null
);

const setupSession = computed(
  () => sessions.value.find(item => item.id === setupSessionId.value) ?? null
);

const getSessionSummary = (session: McpSession) => {
  let readCount = 0;
  let writeCount = 0;

  for (const connection of connectionStore.connections) {
    const access = resolveMcpConnectionAccess(session, connection);
    if (access === McpConnectionAccess.Read) readCount += 1;
    if (access === McpConnectionAccess.Write) writeCount += 1;
  }

  if (readCount + writeCount === 0) return 'No connections';
  return [
    readCount ? `${readCount} read only` : '',
    writeCount ? `${writeCount} read & write` : '',
  ]
    .filter(Boolean)
    .join(' · ');
};

const formatDate = (value: string) =>
  value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
        new Date(value)
      )
    : '';

const handleCopy = async (text: string) => {
  await copyToClipboard(text);
  toast('Copied to clipboard');
};

const openCreateDialog = () => {
  editingSessionId.value = null;
  isSessionDialogOpen.value = true;
};

const openEditDialog = (sessionId: string) => {
  editingSessionId.value = sessionId;
  isSessionDialogOpen.value = true;
};

const handleSubmitSession = (draft: McpSessionDraft) => {
  isSessionDialogOpen.value = false;

  if (editingSessionId.value) {
    updateSession(editingSessionId.value, draft);
    toast('MCP session updated');
    return;
  }

  setupSessionId.value = createSession(draft).id;
};

const handleRegenerateToken = (session: McpSession) => {
  regenerateToken(session.id);
  toast(
    'New token issued. Update your MCP client; the old token no longer works.'
  );
};

const handleDeleteSession = (session: McpSession) => {
  deleteSession(session.id);
  toast(`Revoked "${session.name}"`);
};
</script>

<template>
  <div class="h-full flex flex-col overflow-y-auto gap-4">
    <div>
      <h4
        class="text-sm font-medium leading-7 text-primary flex items-center gap-1 mb-2"
      >
        <Icon name="hugeicons:mcp-server" class="size-5!" /> MCP Server
      </h4>

      <div class="flex items-center justify-between gap-4">
        <div class="flex flex-col gap-0.5">
          <p class="text-sm">Enable MCP server</p>
          <p class="text-xs text-muted-foreground">
            Let AI clients such as Claude Code, Codex or Cursor query your saved
            connections through a session token. Only requests from this
            computer are accepted.
          </p>
        </div>
        <Switch
          id="mcp-server-toggle"
          class="cursor-pointer"
          v-model="appConfigStore.mcpServerConfigs.enabled"
          @update:modelValue="appConfigStore.mcpServerConfigs.enabled = $event"
        />
      </div>
    </div>

    <template v-if="appConfigStore.mcpServerConfigs.enabled">
      <div class="flex flex-col gap-2">
        <p class="text-sm">Endpoint</p>
        <div class="flex items-center gap-2 rounded-md border px-3 py-1.5">
          <code class="text-xs flex-1 truncate">{{ endpointUrl }}</code>
          <Button
            type="button"
            size="iconSm"
            variant="ghost"
            @click="handleCopy(endpointUrl)"
          >
            <Icon name="hugeicons:copy-01" class="size-4!" />
          </Button>
        </div>
        <p class="text-xs text-muted-foreground">
          The endpoint shares the app's port and only works while OrcaQ is open.
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-4">
          <div class="flex flex-col gap-0.5">
            <p class="text-sm">Sessions</p>
            <p class="text-xs text-muted-foreground">
              Each session has its own bearer token and its own access to
              workspaces and connections.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            @click="openCreateDialog"
          >
            <Icon name="hugeicons:add-01" class="size-4!" /> Create session
          </Button>
        </div>

        <p v-if="sessions.length === 0" class="text-xs text-muted-foreground">
          No sessions yet. Create one to get a token for your MCP client.
        </p>

        <div
          v-for="session in sessions"
          :key="session.id"
          class="flex flex-col gap-1.5 rounded-md border px-3 py-2"
        >
          <div class="flex items-center justify-between gap-4">
            <div class="flex flex-col min-w-0">
              <span class="flex items-center gap-2 min-w-0">
                <span class="text-sm truncate">{{ session.name }}</span>
                <Badge
                  v-if="!session.requireToken"
                  variant="outline"
                  class="shrink-0 text-amber-600"
                >
                  No token required
                </Badge>
              </span>
              <span class="text-xs text-muted-foreground truncate">
                {{ getSessionSummary(session) }} ·
                {{ formatDate(session.createdAt) }}
              </span>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                size="iconSm"
                variant="ghost"
                title="Connect a client"
                @click="setupSessionId = session.id"
              >
                <Icon name="hugeicons:code" class="size-4!" />
              </Button>
              <Button
                type="button"
                size="iconSm"
                variant="ghost"
                title="Edit access"
                @click="openEditDialog(session.id)"
              >
                <Icon name="hugeicons:edit-02" class="size-4!" />
              </Button>
              <Button
                type="button"
                size="iconSm"
                variant="ghost"
                title="Regenerate token"
                @click="handleRegenerateToken(session)"
              >
                <Icon name="hugeicons:refresh" class="size-4!" />
              </Button>
              <Button
                type="button"
                size="iconSm"
                variant="ghost"
                title="Revoke session"
                @click="handleDeleteSession(session)"
              >
                <Icon name="hugeicons:delete-02" class="size-4!" />
              </Button>
            </div>
          </div>

          <McpTokenField :token="session.token" @copy="handleCopy" />
        </div>
      </div>
    </template>

    <McpSessionDialog
      v-model:open="isSessionDialogOpen"
      :workspaces="workspaceOptions"
      :initial-draft="editingDraft"
      :default-name="`MCP session ${sessions.length + 1}`"
      :tokenless-session-name="tokenlessSessionName"
      @submit="handleSubmitSession"
    />

    <McpSessionTokenDialog
      :open="Boolean(setupSession)"
      :session-name="setupSession?.name ?? ''"
      :token="setupSession?.token ?? ''"
      :require-token="setupSession?.requireToken ?? true"
      :endpoint-url="endpointUrl"
      @update:open="!$event && (setupSessionId = null)"
      @copy="handleCopy"
    />
  </div>
</template>
