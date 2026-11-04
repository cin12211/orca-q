import type { DbAgentMessage } from '../types';

type DbAgentMessagePart = NonNullable<DbAgentMessage['parts']>[number];

const STABLE_TOOL_PART_STATES = new Set([
  'approval-requested',
  'output-available',
  'output-error',
]);

const isToolPart = (part: DbAgentMessagePart) =>
  typeof part.type === 'string' && part.type.startsWith('tool-');

const isIncompleteToolPart = (part: DbAgentMessagePart) => {
  if (!isToolPart(part)) {
    return false;
  }

  const partState = 'state' in part ? String(part.state || '') : '';

  return !STABLE_TOOL_PART_STATES.has(partState);
};

export const sanitizeDbAgentMessages = (
  messages: DbAgentMessage[]
): DbAgentMessage[] => {
  const sanitizedMessages: DbAgentMessage[] = [];
  let shouldDropRemainingMessages = false;

  for (const message of messages) {
    if (shouldDropRemainingMessages) {
      break;
    }

    if (message.role !== 'assistant' || !Array.isArray(message.parts)) {
      sanitizedMessages.push(message);
      continue;
    }

    const stableParts: DbAgentMessagePart[] = [];

    for (const part of message.parts) {
      if (isIncompleteToolPart(part)) {
        shouldDropRemainingMessages = true;
        break;
      }

      stableParts.push(part);
    }

    if (stableParts.length > 0) {
      sanitizedMessages.push({
        ...message,
        parts: stableParts,
      });
    }
  }

  return sanitizedMessages;
};

export const hasIncompleteDbAgentMessages = (messages: DbAgentMessage[]) => {
  const sanitizedMessages = sanitizeDbAgentMessages(messages);

  return JSON.stringify(sanitizedMessages) !== JSON.stringify(messages);
};
