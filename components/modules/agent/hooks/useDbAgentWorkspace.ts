import { createGlobalState, useStorage } from '@vueuse/core';
import type { AgentHistorySession } from '../types';
import {
  hasIncompleteDbAgentMessages,
  sanitizeDbAgentMessages,
} from '../utils/sanitizeDbAgentMessages';

const SECTION_NODE_IDS = {
  history: 'agent-section-history',
} as const;

const cloneMessages = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

const getFirstUserPrompt = (messages: AgentHistorySession['messages']) =>
  messages
    .find(message => message.role === 'user')
    ?.parts?.find(
      (part): part is { type: 'text'; text: string } => part.type === 'text'
    )
    ?.text?.trim();

const getLastPreview = (messages: AgentHistorySession['messages']) => {
  const lastText = [...messages]
    .reverse()
    .flatMap(message =>
      (message.parts || [])
        .filter(
          (part): part is { type: 'text'; text: string } => part.type === 'text'
        )
        .map(part => part.text)
    )
    .find(Boolean);

  return (lastText || '').replace(/\s+/g, ' ').trim();
};

const historyNodeId = (historyId: string) => `agent-history-${historyId}`;

const sanitizeHistorySession = (history: AgentHistorySession) => {
  const sanitizedMessages = sanitizeDbAgentMessages(history.messages);

  if (!hasIncompleteDbAgentMessages(history.messages)) {
    return history;
  }

  return {
    ...history,
    preview: getLastPreview(sanitizedMessages).slice(0, 140),
    messages: cloneMessages(sanitizedMessages),
  };
};

export const useAgentWorkspace = createGlobalState(() => {
  const currentWorkspaceId = ref<string>('');
  const selectedNodeId = useStorage<string>(
    'heraq-agent-selected-node',
    SECTION_NODE_IDS.history
  );
  const draftShowReasoning = useStorage<boolean>(
    'heraq-agent-draft-show-reasoning',
    true
  );
  const activeHistoryId = useStorage<string | null>(
    'heraq-agent-active-history',
    null
  );
  const showAttachmentPanel = useStorage<boolean>(
    'heraq-agent-attachment-panel-open',
    false
  );
  const histories = useStorage<AgentHistorySession[]>(
    'heraq-agent-chat-history',
    []
  );

  const normalizedHistories = histories.value.map(sanitizeHistorySession);

  if (
    normalizedHistories.some(
      (history, index) => history !== histories.value[index]
    )
  ) {
    histories.value = normalizedHistories;
  }

  const workspaceHistories = computed(() =>
    histories.value.filter(
      h => !h.workspaceId || h.workspaceId === currentWorkspaceId.value
    )
  );

  const sortedHistories = computed(() =>
    [...workspaceHistories.value].sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    )
  );

  const activeHistory = computed(() =>
    activeHistoryId.value
      ? sortedHistories.value.find(item => item.id === activeHistoryId.value) ||
        null
      : null
  );

  const showReasoning = computed({
    get: () => activeHistory.value?.showReasoning ?? draftShowReasoning.value,
    set: value => {
      if (!activeHistoryId.value) {
        draftShowReasoning.value = value;
        return;
      }

      histories.value = histories.value.map(history =>
        history.id === activeHistoryId.value
          ? { ...history, showReasoning: value }
          : history
      );
    },
  });

  const selectNode = (nodeId: string) => {
    selectedNodeId.value = nodeId;

    const matchedHistory = sortedHistories.value.find(
      history => historyNodeId(history.id) === nodeId
    );

    if (matchedHistory) {
      activeHistoryId.value = matchedHistory.id;
    }
  };

  const startNewChat = () => {
    activeHistoryId.value = null;
    selectedNodeId.value = SECTION_NODE_IDS.history;
  };

  const saveConversation = ({
    messages,
    provider,
    model,
    showReasoning,
  }: {
    messages: AgentHistorySession['messages'];
    provider: string;
    model: string;
    showReasoning: boolean;
  }) => {
    const sanitizedMessages = sanitizeDbAgentMessages(messages);
    const firstPrompt = getFirstUserPrompt(sanitizedMessages);

    if (!firstPrompt) {
      return;
    }

    const now = new Date().toISOString();
    const nextId = activeHistoryId.value || `agent-${Date.now().toString(36)}`;
    const existing = histories.value.find(history => history.id === nextId);

    const nextHistory: AgentHistorySession = {
      id: nextId,
      title: (existing?.title || firstPrompt).slice(0, 60),
      preview: getLastPreview(sanitizedMessages).slice(0, 140),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      provider,
      model,
      showReasoning,
      messages: cloneMessages(sanitizedMessages),
      workspaceId: currentWorkspaceId.value || undefined,
    };

    histories.value = [
      nextHistory,
      ...histories.value.filter(history => history.id !== nextId),
    ].slice(0, 40);

    activeHistoryId.value = nextId;
  };

  const loadConversation = (historyId: string) => {
    const history = histories.value.find(item => item.id === historyId);
    if (!history) {
      return null;
    }

    activeHistoryId.value = historyId;
    selectedNodeId.value = historyNodeId(historyId);
    return cloneMessages(history.messages);
  };

  const deleteHistory = (historyId: string) => {
    histories.value = histories.value.filter(h => h.id !== historyId);
    if (activeHistoryId.value === historyId) {
      activeHistoryId.value = null;
    }
    if (selectedNodeId.value === historyNodeId(historyId)) {
      selectedNodeId.value = SECTION_NODE_IDS.history;
    }
  };

  const renameHistory = (historyId: string, nextTitle: string) => {
    histories.value = histories.value.map(history =>
      history.id === historyId ? { ...history, title: nextTitle } : history
    );
  };

  watch(
    sortedHistories,
    nextHistories => {
      if (
        activeHistoryId.value &&
        !nextHistories.some(history => history.id === activeHistoryId.value)
      ) {
        activeHistoryId.value = null;
      }

      if (
        selectedNodeId.value.startsWith('agent-history-') &&
        !nextHistories.some(
          history => historyNodeId(history.id) === selectedNodeId.value
        )
      ) {
        selectedNodeId.value = SECTION_NODE_IDS.history;
      }
    },
    { immediate: true }
  );

  return {
    showAttachmentPanel,
    selectedNodeId,
    currentWorkspaceId,
    histories: sortedHistories,
    activeHistory,
    activeHistoryId,
    showReasoning,
    selectNode,
    startNewChat,
    saveConversation,
    loadConversation,
    deleteHistory,
    renameHistory,
    sectionNodeIds: SECTION_NODE_IDS,
  };
});
