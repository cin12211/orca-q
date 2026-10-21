import { describe, expect, it, vi } from 'vitest';
import { useMongoApproval } from '~/components/modules/driver/mongodb/raw-query/hooks';

describe('useMongoApproval', () => {
  it('shares pending-approval state across every call site', () => {
    const first = useMongoApproval();
    const second = useMongoApproval();

    first.setPendingApproval({ challengeId: 'c1', operations: [] });

    expect(second.pendingApproval.value).toEqual({
      challengeId: 'c1',
      operations: [],
    });

    first.resetApproval();
  });

  it('confirmPendingWrite calls the registered confirm handler', async () => {
    const state = useMongoApproval();
    const confirm = vi.fn().mockResolvedValue('ok');
    const cancel = vi.fn();
    state.registerApprovalHandlers({ confirm, cancel });
    state.setPendingApproval({ challengeId: 'c2', operations: [] });

    await state.confirmPendingWrite();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(state.isConfirming.value).toBe(false);

    state.resetApproval();
  });

  it('cancelPendingWrite calls the registered cancel handler', () => {
    const state = useMongoApproval();
    const confirm = vi.fn();
    const cancel = vi.fn();
    state.registerApprovalHandlers({ confirm, cancel });
    state.setPendingApproval({ challengeId: 'c3', operations: [] });

    state.cancelPendingWrite();

    expect(cancel).toHaveBeenCalledTimes(1);

    state.resetApproval();
  });
});
