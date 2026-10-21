<script setup lang="ts">
import { Switch } from '#components';
import { toast } from 'vue-sonner';
import { copyToClipboard } from '~/core/helpers/copyData';
import {
  McpConnectionAccess,
  resolveMcpConnectionAccess,
  type McpSession,
} from '~/core/persist/store-state';
import { useAppConfigStore } from '~/core/stores/appConfigStore';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { useWorkspacesStore } from '~/core/stores/useWorkspacesStore';
import {
  buildMcpClientSnippets,
  MCP_ENDPOINT_PATH,
  type McpWorkspaceOption,
} from '../constants';
import { useMcpSessions, type McpSessionDraft } from '../hooks';
import { McpSessionDialog, McpSessionTokenDialog } from './mcp-server';

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
const issuedToken = ref<{ sessionName: string; token: string } | null>(null);

const endpointUrl = computed(
  () => `${window.location.origin}${MCP_ENDPOINT_PATH}`
);

const workspaceOptions = computed<McpWorkspaceOption[]>(() =>
  workspacesStore.workspaces.map(workspace => ({
    id: workspace.id,
    name: workspace.name,
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
    workspaceAccess: session.workspaceAccess,
    connectionAccess: session.connectionAccess,
  };
});

const issuedSnippets = computed(() =>
  issuedToken.value
    ? buildMcpClientSnippets(endpointUrl.value, issuedToken.value.token)
    : []
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

const handleSubmitSession = async (draft: McpSessionDraft) => {
  isSessionDialogOpen.value = false;

  if (editingSessionId.value) {
    updateSession(editingSessionId.value, draft);
    toast('MCP session updated');
    return;
  }

  const token = await createSession(draft);
  issuedToken.value = { sessionName: draft.name.trim(), token };
};

const handleRegenerateToken = async (session: McpSession) => {
  const token = await regenerateToken(session.id);
  if (!token) return;

  issuedToken.value = { sessionName: session.name, token };
  toast('New token issued. The old token no longer works.');
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
          class="flex items-center justify-between gap-4 rounded-md border px-3 py-1.5"
        >
          <div class="flex flex-col min-w-0">
            <span class="text-sm truncate">{{ session.name }}</span>
            <span class="text-xs text-muted-foreground truncate">
              {{ session.tokenPreview }} · {{ getSessionSummary(session) }} ·
              {{ formatDate(session.createdAt) }}
            </span>
          </div>

          <div class="flex items-center gap-1 shrink-0">
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
      </div>
    </template>

    <McpSessionDialog
      v-model:open="isSessionDialogOpen"
      :workspaces="workspaceOptions"
      :initial-draft="editingDraft"
      @submit="handleSubmitSession"
    />

    <McpSessionTokenDialog
      :open="Boolean(issuedToken)"
      :session-name="issuedToken?.sessionName ?? ''"
      :token="issuedToken?.token ?? ''"
      :snippets="issuedSnippets"
      @update:open="!$event && (issuedToken = null)"
      @copy="handleCopy"
    />
  </div>
</template>
