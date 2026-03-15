import { lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai';
import { useAiChat } from '~/core/composables/useAiChat';
import { useAppContext } from '~/core/contexts/useAppContext';
import type { AgentCommandOptionId } from '../constants/command-options';
import type { DbAgentMessage } from '../types';
import {
  hasIncompleteDbAgentMessages,
  sanitizeDbAgentMessages,
} from '../utils/sanitizeDbAgentMessages';

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

  const repairIncompleteMessages = () => {
    if (!hasIncompleteDbAgentMessages(chat.messages.value)) {
      return;
    }

    const sanitizedMessages = sanitizeDbAgentMessages(chat.messages.value);

    chat.messages.value.splice(
      0,
      chat.messages.value.length,
      ...sanitizedMessages
    );
  };

  const sendMessage = async (
    text: string,
    nextSelectedCommandOptions: AgentCommandOptionId[] = []
  ) => {
    repairIncompleteMessages();
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
