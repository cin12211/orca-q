import { describe, expect, it, vi } from 'vitest';
import { StatementRunStatus } from '~/components/modules/raw-query/types';
import {
  createPendingStatementResults,
  runStatementsSequentially,
  summarizeStatementResults,
  toStatementPreview,
} from '~/components/modules/raw-query/utils/multiStatementRun';

describe('createPendingStatementResults', () => {
  it('creates one pending entry per statement, keeping order and offsets', () => {
    let next = 0;
    const results = createPendingStatementResults(
      [
        { text: 'SELECT 1;', from: 0 },
        { text: 'SELECT 2;', from: 10 },
      ],
      () => `id-${next++}`
    );

    expect(results).toEqual([
      {
        id: 'id-0',
        index: 0,
        from: 0,
        statementQuery: 'SELECT 1;',
        status: StatementRunStatus.PENDING,
        queryTime: 0,
        result: [],
      },
      {
        id: 'id-1',
        index: 1,
        from: 10,
        statementQuery: 'SELECT 2;',
        status: StatementRunStatus.PENDING,
        queryTime: 0,
        result: [],
      },
    ]);
  });
});

describe('runStatementsSequentially', () => {
  it('runs every statement in order when all succeed', async () => {
    const order: number[] = [];
    const statuses = await runStatementsSequentially({
      count: 3,
      isCancelled: () => false,
      runOne: async index => {
        order.push(index);
        return StatementRunStatus.SUCCESS;
      },
    });

    expect(order).toEqual([0, 1, 2]);
    expect(statuses).toEqual([
      StatementRunStatus.SUCCESS,
      StatementRunStatus.SUCCESS,
      StatementRunStatus.SUCCESS,
    ]);
  });

  it('waits for each statement before starting the next', async () => {
    let running = 0;
    let maxRunning = 0;

    await runStatementsSequentially({
      count: 3,
      isCancelled: () => false,
      runOne: async () => {
        running += 1;
        maxRunning = Math.max(maxRunning, running);
        await new Promise(resolve => setTimeout(resolve, 1));
        running -= 1;
        return StatementRunStatus.SUCCESS;
      },
    });

    expect(maxRunning).toBe(1);
  });

  it('stops at the first error and skips the rest', async () => {
    const runOne = vi.fn(async (index: number) =>
      index === 1 ? StatementRunStatus.ERROR : StatementRunStatus.SUCCESS
    );
    const onNotRun = vi.fn();

    const statuses = await runStatementsSequentially({
      count: 4,
      isCancelled: () => false,
      runOne,
      onNotRun,
    });

    expect(runOne).toHaveBeenCalledTimes(2);
    expect(statuses).toEqual([
      StatementRunStatus.SUCCESS,
      StatementRunStatus.ERROR,
      StatementRunStatus.SKIPPED,
      StatementRunStatus.SKIPPED,
    ]);
    expect(onNotRun.mock.calls).toEqual([
      [2, StatementRunStatus.SKIPPED],
      [3, StatementRunStatus.SKIPPED],
    ]);
  });

  it('marks the rest cancelled when a statement is cancelled', async () => {
    const statuses = await runStatementsSequentially({
      count: 3,
      isCancelled: () => false,
      runOne: async () => StatementRunStatus.CANCELLED,
    });

    expect(statuses).toEqual([
      StatementRunStatus.CANCELLED,
      StatementRunStatus.CANCELLED,
      StatementRunStatus.CANCELLED,
    ]);
  });

  it('stops before the next statement once cancel is requested', async () => {
    let cancelled = false;
    const runOne = vi.fn(async () => {
      cancelled = true;
      return StatementRunStatus.SUCCESS;
    });

    const statuses = await runStatementsSequentially({
      count: 3,
      isCancelled: () => cancelled,
      runOne,
    });

    expect(runOne).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual([
      StatementRunStatus.SUCCESS,
      StatementRunStatus.CANCELLED,
      StatementRunStatus.CANCELLED,
    ]);
  });

  it('returns an empty list for no statements', async () => {
    const runOne = vi.fn();
    expect(
      await runStatementsSequentially({
        count: 0,
        isCancelled: () => false,
        runOne,
      })
    ).toEqual([]);
    expect(runOne).not.toHaveBeenCalled();
  });
});

describe('summarizeStatementResults', () => {
  it('counts statements per status and sums query time', () => {
    expect(
      summarizeStatementResults([
        { status: StatementRunStatus.SUCCESS, queryTime: 10 },
        { status: StatementRunStatus.SUCCESS, queryTime: 5 },
        { status: StatementRunStatus.ERROR, queryTime: 2 },
        { status: StatementRunStatus.SKIPPED, queryTime: 0 },
        { status: StatementRunStatus.CANCELLED, queryTime: 0 },
        { status: StatementRunStatus.RUNNING, queryTime: 0 },
        { status: StatementRunStatus.PENDING, queryTime: 0 },
      ])
    ).toEqual({
      total: 7,
      succeeded: 2,
      failed: 1,
      skipped: 1,
      cancelled: 1,
      pending: 2,
      totalQueryTime: 17,
    });
  });
});

describe('toStatementPreview', () => {
  it('collapses whitespace into one line', () => {
    expect(toStatementPreview('SELECT *\n  FROM\tusers;')).toBe(
      'SELECT * FROM users;'
    );
  });

  it('cuts long statements with an ellipsis', () => {
    const preview = toStatementPreview(`SELECT ${'a, '.repeat(50)}b`, 20);
    expect(preview.length).toBeLessThanOrEqual(20);
    expect(preview.endsWith('…')).toBe(true);
  });
});
