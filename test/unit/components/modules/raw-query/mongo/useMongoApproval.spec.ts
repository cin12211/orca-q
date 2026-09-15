import { describe, expect, it, vi } from 'vitest';
import { useMongoApproval } from '~/components/modules/raw-query/mongo/hooks/useMongoApproval';

describe('useMongoApproval', () => {
  it('manages pendingApproval state and executes confirm handlers', async () => {
    const approval = useMongoApproval();
    approval.resetApproval();

    expect(approval.pendingApproval.value).toBeNull();
    expect(approval.isConfirming.value).toBe(false);

    const mockOperation = {
      id: 'op-1',
      target: 'collection' as const,
      method: 'drop',
      collection: 'test_col',
      dynamicDatabase: false,
      dynamicTarget: false,
      risk: 'destructive' as const,
      summary: 'Drop collection',
    };

    approval.setPendingApproval({
      challengeId: 'ch-123',
      operations: [mockOperation],
    });

    expect(approval.pendingApproval.value).toEqual({
      challengeId: 'ch-123',
      operations: [mockOperation],
    });

    const confirmFn = vi.fn().mockResolvedValue('ok');
    const cancelFn = vi.fn();

    approval.registerApprovalHandlers({
      confirm: confirmFn,
      cancel: cancelFn,
    });

    await approval.confirmPendingWrite();
    expect(confirmFn).toHaveBeenCalledTimes(1);
    expect(approval.isConfirming.value).toBe(false);

    approval.cancelPendingWrite();
    expect(cancelFn).toHaveBeenCalledTimes(1);
  });

  it('handles cancelPendingWrite without active handlers by clearing pendingApproval', () => {
    const approval = useMongoApproval();
    approval.resetApproval();

    approval.setPendingApproval({
      challengeId: 'ch-999',
      operations: [],
    });

    expect(approval.pendingApproval.value).not.toBeNull();

    approval.cancelPendingWrite();
    expect(approval.pendingApproval.value).toBeNull();
  });
});
