import { createGlobalState, useDebounceFn } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import type { AgentHistorySession } from '~/components/modules/agent/types';
import {
  hasIncompleteDbAgentMessages,
  sanitizeDbAgentMessages,
} from '~/components/modules/agent/utils/sanitizeDbAgentMessages';
import {
  normalizeAgentState,
  type AgentPersistedState,
} from '~/core/persist/store-state';
import { createStorageApis } from '~/core/storage';

// ── Private helpers ──────────────────────────────────────────────────

const SECTION_NODE_IDS = {
  history: 'agent-section-history',
} as const;

const cloneMessages = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

const getFirstUserPrompt = (
  messages: AgentHistorySession['messages']
): string | undefined =>
  messages
    .find(m => m.role === 'user')
    ?.parts?.find((p): p is { type: 'text'; text: string } => p.type === 'text')
    ?.text?.trim();

const getLastPreview = (messages: AgentHistorySession['messages']): string => {
  const lastText = [...messages]
    .reverse()
    .flatMap(m =>
      (m.parts || [])
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map(p => p.text)
    )
    .find(Boolean);
  return (lastText || '').replace(/\s+/g, ' ').trim();
};

const historyNodeId = (id: string) => `agent-history-${id}`;

const sanitizeHistorySession = (
  history: AgentHistorySession
): AgentHistorySession => {
  const sanitizedMessages = sanitizeDbAgentMessages(history.messages);
  if (!hasIncompleteDbAgentMessages(history.messages)) return history;
  return {
    ...history,
    preview: getLastPreview(sanitizedMessages).slice(0, 140),
    messages: cloneMessages(sanitizedMessages),
  };
};

// ── Global singleton state ───────────────────────────────────────────

export const useAgentStore = createGlobalState(() => {
  const storageApis = createStorageApis();
  const isHydratingPersist = ref(false);
  const hasLoadedPersist = ref(false);

  const currentWorkspaceId = ref<string>('');

  const selectedNodeId = ref<string>(SECTION_NODE_IDS.history);
  const draftShowReasoning = ref<boolean>(true);
  const activeHistoryId = ref<string | null>(null);
  const showAttachmentPanel = ref<boolean>(false);
  const histories = ref<AgentHistorySession[]>([]);

  // ── Computed ────────────────────────────────────────────────────────

  const workspaceHistories = computed(() =>
    histories.value.filter(
      h => !h.workspaceId || h.workspaceId === currentWorkspaceId.value
    )
  );

  const sortedHistories = computed(() =>
    [...workspaceHistories.value].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  );

  const activeHistory = computed(() =>
    activeHistoryId.value
      ? (sortedHistories.value.find(h => h.id === activeHistoryId.value) ??
        null)
      : null
  );

  const showReasoning = computed({
    get: () => activeHistory.value?.showReasoning ?? draftShowReasoning.value,
    set: (value: boolean) => {
      if (!activeHistoryId.value) {
        draftShowReasoning.value = value;
        return;
      }
      histories.value = histories.value.map(h =>
        h.id === activeHistoryId.value ? { ...h, showReasoning: value } : h
      );
    },
  });

  // ── Actions ─────────────────────────────────────────────────────────

  const selectNode = (nodeId: string) => {
    selectedNodeId.value = nodeId;
    const matched = sortedHistories.value.find(
      h => historyNodeId(h.id) === nodeId
    );
    if (matched) activeHistoryId.value = matched.id;
  };

  const startNewChat = () => {
    activeHistoryId.value = null;
    selectedNodeId.value = SECTION_NODE_IDS.history;
  };

  const saveConversation = ({
    messages,
    provider,
    model,
    showReasoning: sr,
  }: {
    messages: AgentHistorySession['messages'];
    provider: string;
    model: string;
    showReasoning: boolean;
  }) => {
    const sanitizedMessages = sanitizeDbAgentMessages(messages);
    const firstPrompt = getFirstUserPrompt(sanitizedMessages);
    if (!firstPrompt) return;

    const now = new Date().toISOString();
    const nextId = activeHistoryId.value || `agent-${Date.now().toString(36)}`;
    const existing = histories.value.find(h => h.id === nextId);

    const nextHistory: AgentHistorySession = {
      id: nextId,
      title: (existing?.title || firstPrompt).slice(0, 60),
      preview: getLastPreview(sanitizedMessages).slice(0, 140),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      provider,
      model,
      showReasoning: sr,
      messages: cloneMessages(sanitizedMessages),
      workspaceId: currentWorkspaceId.value || undefined,
    };

    histories.value = [
      nextHistory,
      ...histories.value.filter(h => h.id !== nextId),
    ].slice(0, 40);

    activeHistoryId.value = nextId;
  };

  const loadConversation = (historyId: string) => {
    const history = histories.value.find(h => h.id === historyId);
    if (!history) return null;
    activeHistoryId.value = historyId;
    selectedNodeId.value = historyNodeId(historyId);
    return cloneMessages(history.messages);
  };

  const deleteHistory = (historyId: string) => {
    histories.value = histories.value.filter(h => h.id !== historyId);
    if (activeHistoryId.value === historyId) activeHistoryId.value = null;
    if (selectedNodeId.value === historyNodeId(historyId)) {
      selectedNodeId.value = SECTION_NODE_IDS.history;
    }
  };

  const renameHistory = (historyId: string, nextTitle: string) => {
    histories.value = histories.value.map(h =>
      h.id === historyId ? { ...h, title: nextTitle } : h
    );
  };

  const replaceHistories = (items: AgentHistorySession[]) => {
    histories.value = items;
    activeHistoryId.value = null;
    selectedNodeId.value = SECTION_NODE_IDS.history;
  };

  const getPersistedState = (): AgentPersistedState =>
    normalizeAgentState({
      selectedNodeId: selectedNodeId.value,
      draftShowReasoning: draftShowReasoning.value,
      activeHistoryId: activeHistoryId.value,
      showAttachmentPanel: showAttachmentPanel.value,
      histories: histories.value,
    });

  const applyPersistedState = (state: AgentPersistedState) => {
    const normalized = normalizeAgentState(state);
    selectedNodeId.value = normalized.selectedNodeId;
    draftShowReasoning.value = normalized.draftShowReasoning;
    activeHistoryId.value = normalized.activeHistoryId;
    showAttachmentPanel.value = normalized.showAttachmentPanel;
    histories.value = normalized.histories as unknown as AgentHistorySession[];
  };

  const persistState = useDebounceFn(async (state: AgentPersistedState) => {
    await storageApis.agentStorage.save(state);
  }, 120);

  const loadPersistData = async () => {
    isHydratingPersist.value = true;

    try {
      const persisted = await storageApis.agentStorage.get();
      if (persisted) {
        applyPersistedState(persisted);
      }
    } finally {
      hasLoadedPersist.value = true;
      isHydratingPersist.value = false;
    }
  };

  watch(
    getPersistedState,
    state => {
      if (!hasLoadedPersist.value || isHydratingPersist.value) {
        return;
      }

      void persistState(state);
    },
    { deep: true }
  );

  watch(
    sortedHistories,
    nextHistories => {
      if (
        activeHistoryId.value &&
        !nextHistories.some(h => h.id === activeHistoryId.value)
      ) {
        activeHistoryId.value = null;
      }
      if (
        selectedNodeId.value.startsWith('agent-history-') &&
        !nextHistories.some(h => historyNodeId(h.id) === selectedNodeId.value)
      ) {
        selectedNodeId.value = SECTION_NODE_IDS.history;
      }
    },
    { immediate: true }
  );

  return {
    // State
    showAttachmentPanel,
    selectedNodeId,
    currentWorkspaceId,
    histories: sortedHistories,
    activeHistory,
    activeHistoryId,
    showReasoning,
    hasLoadedPersist,
    // Actions
    selectNode,
    startNewChat,
    saveConversation,
    loadConversation,
    deleteHistory,
    renameHistory,
    replaceHistories,
    loadPersistData,
    historyNodeId,
    SECTION_NODE_IDS,
  };
});
