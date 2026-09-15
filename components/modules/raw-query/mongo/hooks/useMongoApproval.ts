import { ref, type Ref } from 'vue';
import type { MongoRawQueryOperation } from '~/core/types/mongodb-raw-query.types';

export interface MongoPendingApproval {
  challengeId: string;
  operations: MongoRawQueryOperation[];
}

export interface MongoApprovalHandlers {
  confirm: () => Promise<unknown>;
  cancel: () => void;
}

export interface MongoApprovalState {
  pendingApproval: Ref<MongoPendingApproval | null>;
  isConfirming: Ref<boolean>;
  setPendingApproval: (approval: MongoPendingApproval | null) => void;
  registerApprovalHandlers: (handlers: MongoApprovalHandlers) => void;
  confirmPendingWrite: () => Promise<unknown>;
  cancelPendingWrite: () => void;
  resetApproval: () => void;
}

const pendingApproval = ref<MongoPendingApproval | null>(null);
const isConfirming = ref(false);
let activeHandlers: MongoApprovalHandlers | null = null;

export function useMongoApproval(): MongoApprovalState {
  const setPendingApproval = (approval: MongoPendingApproval | null) => {
    pendingApproval.value = approval;
  };

  const registerApprovalHandlers = (handlers: MongoApprovalHandlers) => {
    activeHandlers = handlers;
  };

  const confirmPendingWrite = async () => {
    if (!activeHandlers || !pendingApproval.value) return;
    isConfirming.value = true;
    try {
      await activeHandlers.confirm();
    } finally {
      isConfirming.value = false;
    }
  };

  const cancelPendingWrite = () => {
    if (activeHandlers) {
      activeHandlers.cancel();
    } else {
      pendingApproval.value = null;
    }
  };

  const resetApproval = () => {
    pendingApproval.value = null;
    isConfirming.value = false;
    activeHandlers = null;
  };

  return {
    pendingApproval,
    isConfirming,
    setPendingApproval,
    registerApprovalHandlers,
    confirmPendingWrite,
    cancelPendingWrite,
    resetApproval,
  };
}
