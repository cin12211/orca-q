import { createGlobalState, useStorage } from '@vueuse/core';
import type { FileNode } from '~/components/base/tree-folder/types';
import type {
  AgentControlSection,
  AgentHistorySession,
  AgentPresetItem,
  AgentSelectedContext,
} from '../types';

const ROOT_NODE_ID = 'agent-control-root';
const SECTION_NODE_IDS = {
  mcp: 'agent-section-mcp',
  rules: 'agent-section-rules',
  skills: 'agent-section-skills',
  history: 'agent-section-history',
} as const;

const MCP_ITEMS: AgentPresetItem[] = [
  {
    id: 'mcp.config.json',
    name: 'mcp.config.json',
    title: 'MCP Server Registry',
    description:
      'Configure external MCP servers, transport mode, auth, and enabled status for agent tools.',
    promptSuggestion: 'Summarize the MCP servers this agent should expose.',
  },
];

const RULE_ITEMS: AgentPresetItem[] = [
  {
    id: 'general.md',
    name: 'general.md',
    title: 'General Rules',
    description:
      'Shared response style, naming conventions, and safe query defaults injected into every request.',
    promptSuggestion: 'List the global rules that should shape this answer.',
  },
  {
    id: 'naming.md',
    name: 'naming.md',
    title: 'Naming Rules',
    description:
      'Column, table, and field naming conventions the assistant should keep consistent.',
    promptSuggestion:
      'Generate SQL that follows the project naming convention.',
  },
  {
    id: 'security.md',
    name: 'security.md',
    title: 'Security Guardrails',
    description:
      'Puts approval and privacy constraints in front of risky queries or exports.',
    promptSuggestion:
      'Explain how the security rules affect this database request.',
  },
];

const SKILL_ITEMS: AgentPresetItem[] = [
  {
    id: 'monthly-report.md',
    name: 'monthly-report.md',
    title: 'Monthly Revenue Report',
    description:
      'Reusable workflow for monthly KPIs, MoM comparison, and concise markdown summaries.',
    promptSuggestion: 'Run the monthly revenue report skill for this schema.',
  },
  {
    id: 'find-duplicates.md',
    name: 'find-duplicates.md',
    title: 'Find Duplicates',
    description:
      'A repeatable flow for duplicate detection and follow-up validation queries.',
    promptSuggestion:
      'Use the find duplicates skill to inspect suspicious duplicate records.',
  },
  {
    id: 'audit-changes.md',
    name: 'audit-changes.md',
    title: 'Audit Changes',
    description:
      'Guides the agent through audit-trail style analysis and mutation review.',
    promptSuggestion:
      'Use the audit changes skill to review recent state changes.',
  },
];

const SECTION_META: Record<
  AgentControlSection,
  {
    id: string;
    title: string;
    description: string;
    icon: string;
    badge: string;
  }
> = {
  'mcp-config': {
    id: SECTION_NODE_IDS.mcp,
    title: 'MCP Config',
    description:
      'Model Context Protocol servers extend the agent with external tools and systems.',
    icon: 'lucide:plug-zap',
    badge: 'Tooling',
  },
  rules: {
    id: SECTION_NODE_IDS.rules,
    title: 'Rules',
    description:
      'Persistent instructions that shape every answer, query plan, and response format.',
    icon: 'lucide:shield-check',
    badge: 'Always On',
  },
  skills: {
    id: SECTION_NODE_IDS.skills,
    title: 'Skills',
    description:
      'Reusable multi-step workflows for reports, anomaly scans, and domain-specific operations.',
    icon: 'lucide:sparkles',
    badge: 'Reusable',
  },
  'chat-history': {
    id: SECTION_NODE_IDS.history,
    title: 'Chat History',
    description:
      'Resume earlier conversations, continue a thread, or branch into a new agent session.',
    icon: 'lucide:history',
    badge: 'Sessions',
  },
};

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

export const useAgentWorkspace = createGlobalState(() => {
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
  const histories = useStorage<AgentHistorySession[]>(
    'heraq-agent-chat-history',
    []
  );

  const sortedHistories = computed(() =>
    [...histories.value].sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    )
  );

  const sectionCounts = computed(() => ({
    rules: RULE_ITEMS.length,
    skills: SKILL_ITEMS.length,
    history: sortedHistories.value.length,
    mcp: MCP_ITEMS.length,
  }));

  const defaultExpandedNodeIds = [
    ROOT_NODE_ID,
    ...Object.values(SECTION_NODE_IDS),
  ];

  const treeData = computed<Record<string, FileNode>>(() => {
    const nodes: Record<string, FileNode> = {
      [ROOT_NODE_ID]: {
        id: ROOT_NODE_ID,
        parentId: null,
        name: '.db-agent',
        type: 'folder',
        depth: 0,
        iconOpen: 'lucide:bot',
        iconClose: 'lucide:bot',
        children: Object.values(SECTION_NODE_IDS).filter(
          id => id !== SECTION_NODE_IDS.history
        ),
      },
    };

    for (const [section, meta] of Object.entries(SECTION_META) as [
      AgentControlSection,
      (typeof SECTION_META)[AgentControlSection],
    ][]) {
      nodes[meta.id] = {
        id: meta.id,
        parentId: section === 'chat-history' ? null : ROOT_NODE_ID,
        name: meta.title,
        type: 'folder',
        depth: section === 'chat-history' ? 0 : 1,
        iconOpen: meta.icon,
        iconClose: meta.icon,
        children: [],
      };

      if (section === 'mcp-config') {
        MCP_ITEMS.forEach(item => {
          const nodeId = `agent-mcp-${item.id}`;
          nodes[nodeId] = {
            id: nodeId,
            parentId: meta.id,
            name: item.name,
            type: 'file',
            depth: 2,
            iconOpen: 'lucide:file-json-2',
            iconClose: 'lucide:file-json-2',
          };
          nodes[meta.id].children?.push(nodeId);
        });
      }

      if (section === 'rules') {
        RULE_ITEMS.forEach(item => {
          const nodeId = `agent-rule-${item.id}`;
          nodes[nodeId] = {
            id: nodeId,
            parentId: meta.id,
            name: item.name,
            type: 'file',
            depth: 2,
            iconOpen: 'lucide:file-text',
            iconClose: 'lucide:file-text',
          };
          nodes[meta.id].children?.push(nodeId);
        });
      }

      if (section === 'skills') {
        SKILL_ITEMS.forEach(item => {
          const nodeId = `agent-skill-${item.id}`;
          nodes[nodeId] = {
            id: nodeId,
            parentId: meta.id,
            name: item.name,
            type: 'file',
            depth: 2,
            iconOpen: 'lucide:sparkles',
            iconClose: 'lucide:sparkles',
          };
          nodes[meta.id].children?.push(nodeId);
        });
      }

      if (section === 'chat-history') {
        sortedHistories.value.forEach(history => {
          const nodeId = historyNodeId(history.id);
          nodes[nodeId] = {
            id: nodeId,
            parentId: meta.id,
            name: history.title,
            type: 'file',
            depth: 1,
            iconOpen: 'hugeicons:chat-spark-01',
            iconClose: 'hugeicons:chat-spark-01',
          };
          nodes[meta.id].children?.push(nodeId);
        });
      }
    }

    return nodes;
  });

  const selectedContext = computed<AgentSelectedContext>(() => {
    const nodeId = selectedNodeId.value;

    if (nodeId === ROOT_NODE_ID) {
      return {
        id: ROOT_NODE_ID,
        section: 'chat-history',
        kind: 'root',
        title: '.db-agent workspace',
        description:
          'Agent controls live here: MCP config, persistent rules, reusable skills, and prior conversations.',
        badge: 'Workspace',
      };
    }

    for (const [section, meta] of Object.entries(SECTION_META) as [
      AgentControlSection,
      (typeof SECTION_META)[AgentControlSection],
    ][]) {
      if (nodeId === meta.id) {
        return {
          id: meta.id,
          section,
          kind: 'section',
          title: meta.title,
          description: meta.description,
          badge: meta.badge,
        };
      }
    }

    const ruleItem = RULE_ITEMS.find(
      item => `agent-rule-${item.id}` === nodeId
    );
    if (ruleItem) {
      return {
        id: nodeId,
        section: 'rules',
        kind: 'rule-file',
        title: ruleItem.title,
        description: ruleItem.description,
        promptSuggestion: ruleItem.promptSuggestion,
        badge: 'Rule',
      };
    }

    const skillItem = SKILL_ITEMS.find(
      item => `agent-skill-${item.id}` === nodeId
    );
    if (skillItem) {
      return {
        id: nodeId,
        section: 'skills',
        kind: 'skill-file',
        title: skillItem.title,
        description: skillItem.description,
        promptSuggestion: skillItem.promptSuggestion,
        badge: 'Skill',
      };
    }

    const mcpItem = MCP_ITEMS.find(item => `agent-mcp-${item.id}` === nodeId);
    if (mcpItem) {
      return {
        id: nodeId,
        section: 'mcp-config',
        kind: 'mcp-file',
        title: mcpItem.title,
        description: mcpItem.description,
        promptSuggestion: mcpItem.promptSuggestion,
        badge: 'Config',
      };
    }

    const history = sortedHistories.value.find(
      item => historyNodeId(item.id) === nodeId
    );
    if (history) {
      return {
        id: nodeId,
        section: 'chat-history',
        kind: 'history-entry',
        title: history.title,
        description: history.preview || 'Resume this saved conversation.',
        badge: 'History',
      };
    }

    return {
      id: SECTION_NODE_IDS.history,
      section: 'chat-history',
      kind: 'section',
      title: SECTION_META['chat-history'].title,
      description: SECTION_META['chat-history'].description,
      badge: SECTION_META['chat-history'].badge,
    };
  });

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
    const firstPrompt = getFirstUserPrompt(messages);

    if (!firstPrompt) {
      return;
    }

    const now = new Date().toISOString();
    const nextId = activeHistoryId.value || `agent-${Date.now().toString(36)}`;
    const existing = histories.value.find(history => history.id === nextId);

    const nextHistory: AgentHistorySession = {
      id: nextId,
      title: (existing?.title || firstPrompt).slice(0, 60),
      preview: getLastPreview(messages).slice(0, 140),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      provider,
      model,
      showReasoning,
      messages: cloneMessages(messages),
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

  return {
    treeData,
    selectedNodeId,
    selectedContext,
    defaultExpandedNodeIds,
    sectionCounts,
    histories: sortedHistories,
    activeHistory,
    activeHistoryId,
    showReasoning,
    selectNode,
    startNewChat,
    saveConversation,
    loadConversation,
    sectionNodeIds: SECTION_NODE_IDS,
  };
});
