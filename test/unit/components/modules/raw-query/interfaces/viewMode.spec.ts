import { describe, expect, it } from 'vitest';
import {
  ViewMode,
  type ExecutedResultItem,
} from '~/components/modules/raw-query/interfaces';

describe('ViewMode', () => {
  it('has a CONSOLE member for MongoDB script output', () => {
    expect(ViewMode.CONSOLE).toBe('console');
  });
});

describe('ExecutedResultItem metadata', () => {
  it('accepts the optional MongoDB-specific fields without a type error', () => {
    const item: ExecutedResultItem = {
      id: 'x',
      metadata: {
        queryTime: 0,
        statementQuery: '',
        executedAt: new Date(),
        executeErrors: undefined,
        resultKind: 'cursor',
        logs: [{ level: 'log', args: ['hi'] }],
        mutationSummary: { acknowledged: true, insertedCount: 1 },
        rawResult: { ok: 1 },
        truncated: false,
      },
      result: [],
      seqIndex: 0,
      view: ViewMode.CONSOLE,
    };

    expect(item.metadata.resultKind).toBe('cursor');
  });
});
