import { lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai';
import { useAiChat } from '~/core/composables/useAiChat';
import { useAppContext } from '~/core/contexts/useAppContext';
import {
  getAgentCommandOptionsByIds,
  type AgentCommandOptionId,
} from '../constants/command-options';
import type { DbAgentMessage } from '../types';
import {
  hasIncompleteDbAgentMessages,
  sanitizeDbAgentMessages,
} from '../utils/sanitizeDbAgentMessages';

function buildMessageWithCommandHints(
  text: string,
  commandOptionIds: AgentCommandOptionId[]
): string {
  if (commandOptionIds.length === 0) return text;

  const options = getAgentCommandOptionsByIds(commandOptionIds);
  const hints = options.map(o => `${o.label}: ${o.promptHint}`).join('\n');

  return `[Tool hints]\n${hints}\n\n${text}`;
}

export function useAgentChat(sendReasoning?: Ref<boolean>) {
  const { schemaStore, connectionStore } = useAppContext();

  const chat = useAiChat<DbAgentMessage>({
    api: '/api/ai/agent',
    body: () => ({
      dbConnectionString: connectionStore.selectedConnection?.connectionString,
      dbType: connectionStore.selectedConnection?.type,
      schemaSnapshots: schemaStore.activeSchemas || [],
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

    const messageText = buildMessageWithCommandHints(
      text,
      nextSelectedCommandOptions
    );

    await chat.sendMessage(messageText);
  };

  return {
    ...chat,
    sendMessage,
  };
}
