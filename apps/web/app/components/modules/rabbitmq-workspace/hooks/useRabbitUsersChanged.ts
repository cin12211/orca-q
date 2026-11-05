import { useEventBus, type EventBusKey } from '@vueuse/core';

export interface RabbitUsersChangedEvent {
  connectionId: string;
  userName: string;
  isDeleted?: boolean;
}

const RABBIT_USERS_CHANGED: EventBusKey<RabbitUsersChangedEvent> = Symbol(
  'rabbit-users-changed'
);

/** Lets the Users sidebar reload after a user tab changes something. */
export const useRabbitUsersChanged = () => useEventBus(RABBIT_USERS_CHANGED);
