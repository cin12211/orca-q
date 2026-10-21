<script setup lang="ts">
import { Switch } from '#components';
import { toast } from 'vue-sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { copyToClipboard } from '~/core/helpers/copyData';
import { McpConnectionAccess } from '~/core/persist/store-state';
import { useAppConfigStore } from '~/core/stores/appConfigStore';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { useWorkspacesStore } from '~/core/stores/useWorkspacesStore';
import {
  MCP_CONNECTION_ACCESS_OPTIONS,
  MCP_ENDPOINT_PATH,
  MCP_SERVER_NAME,
} from '../constants';

const appConfigStore = useAppConfigStore();
const connectionStore = useManagementConnectionStore();
const workspacesStore = useWorkspacesStore();

const endpointUrl = computed(
  () => `${window.location.origin}${MCP_ENDPOINT_PATH}`
);

const clientSnippets = computed(() => [
  {
    name: 'Claude Code',
    code: `claude mcp add --transport http ${MCP_SERVER_NAME} ${endpointUrl.value}`,
  },
  {
    name: 'Codex (~/.codex/config.toml)',
    code: `[mcp_servers.${MCP_SERVER_NAME}]\nurl = "${endpointUrl.value}"`,
  },
  {
    name: 'Claude Desktop / Cursor (JSON)',
    code: JSON.stringify(
      {
        mcpServers: {
          [MCP_SERVER_NAME]: {
            command: 'npx',
            args: ['-y', 'mcp-remote', endpointUrl.value],
          },
        },
      },
      null,
      2
    ),
  },
]);

const connectionRows = computed(() => {
  const workspaceNames = new Map(
    workspacesStore.workspaces.map(workspace => [workspace.id, workspace.name])
  );

  return connectionStore.connections.map(connection => ({
    id: connection.id,
    name: connection.name,
    type: connection.type,
    workspaceName: workspaceNames.get(connection.workspaceId) ?? '',
  }));
});

const getConnectionAccess = (connectionId: string) =>
  appConfigStore.mcpServerConfigs.connectionAccess[connectionId] ??
  McpConnectionAccess.Read;

const setConnectionAccess = (connectionId: string, value: unknown) => {
  appConfigStore.mcpServerConfigs.connectionAccess[connectionId] =
    value as McpConnectionAccess;
};

const handleCopy = async (text: string) => {
  await copyToClipboard(text);
  toast('Copied to clipboard');
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
            connections. Only requests from this computer are accepted.
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
        <p class="text-sm">Connect a client</p>
        <div
          v-for="snippet in clientSnippets"
          :key="snippet.name"
          class="rounded-md border"
        >
          <div class="flex items-center justify-between px-3 py-1 border-b">
            <span class="text-xs text-muted-foreground">{{
              snippet.name
            }}</span>
            <Button
              type="button"
              size="iconSm"
              variant="ghost"
              @click="handleCopy(snippet.code)"
            >
              <Icon name="hugeicons:copy-01" class="size-4!" />
            </Button>
          </div>
          <pre class="text-xs px-3 py-2 overflow-x-auto">{{
            snippet.code
          }}</pre>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex flex-col gap-0.5">
          <p class="text-sm">Connection access</p>
          <p class="text-xs text-muted-foreground">
            Read only runs queries in a read-only transaction. Read & write lets
            the AI client change data and schema, so enable it only for
            connections you can afford to modify.
          </p>
        </div>

        <p
          v-if="connectionRows.length === 0"
          class="text-xs text-muted-foreground"
        >
          No saved connections yet.
        </p>

        <div
          v-for="connection in connectionRows"
          :key="connection.id"
          class="flex items-center justify-between gap-4 rounded-md border px-3 py-1.5"
        >
          <div class="flex flex-col min-w-0">
            <span class="text-sm truncate">{{ connection.name }}</span>
            <span class="text-xs text-muted-foreground truncate">
              {{ connection.type }}
              <template v-if="connection.workspaceName">
                · {{ connection.workspaceName }}
              </template>
            </span>
          </div>

          <Select
            size="xs"
            :model-value="getConnectionAccess(connection.id)"
            @update:model-value="setConnectionAccess(connection.id, $event)"
          >
            <SelectTrigger class="min-w-32 cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in MCP_CONNECTION_ACCESS_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </template>
  </div>
</template>
