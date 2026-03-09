import { lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai';
import { useAiChat } from '~/core/composables/useAiChat';
import { useAppContext } from '~/core/contexts/useAppContext';
import type { AgentCommandOptionId } from '../constants/command-options';
import type { DbAgentMessage } from '../types';

export function useAgentChat(sendReasoning?: Ref<boolean>) {
  const { schemaStore, connectionStore } = useAppContext();
  const selectedCommandOptions = ref<AgentCommandOptionId[]>([]);

  const chat = useAiChat<DbAgentMessage>({
    api: '/api/ai/agent',
    body: () => ({
      dbConnectionString: connectionStore.selectedConnection?.connectionString,
      dbType: connectionStore.selectedConnection?.type,
      schemaSnapshots: schemaStore.activeSchemas || [],
      selectedCommandOptions:
        selectedCommandOptions.value.length > 0
          ? [...selectedCommandOptions.value]
          : undefined,
      sendReasoning: sendReasoning?.value ?? true,
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });

  const sendMessage = async (
    text: string,
    nextSelectedCommandOptions: AgentCommandOptionId[] = []
  ) => {
    selectedCommandOptions.value = [...nextSelectedCommandOptions];

    try {
      await chat.sendMessage(text);
    } finally {
      selectedCommandOptions.value = [];
    }
  };

  return {
    ...chat,
    sendMessage,
  };
}
