import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCopyToClipboard } from '~/core/composables/useCopyToClipboard';
import { copyToClipboard } from '~/core/helpers/copyData';

vi.mock('~/core/helpers/copyData', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(undefined),
}));

describe('useCopyToClipboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with copied false', () => {
    const { copied } = useCopyToClipboard();
    expect(copied.value).toBe(false);
  });

  it('copies single text and toggles copied state', async () => {
    const { copied, handleCopy } = useCopyToClipboard(100);

    await handleCopy('SELECT 1');

    expect(copyToClipboard).toHaveBeenCalledWith('SELECT 1');
    expect(copied.value).toBe(true);
  });

  it('auto-resets copied state after delay', async () => {
    const { copied, handleCopy } = useCopyToClipboard(100);

    await handleCopy('SELECT 2');
    vi.advanceTimersByTime(100);

    expect(copied.value).toBe(false);
  });

  it('copies with key and marks keyed state', async () => {
    const { copiedStates, handleCopyWithKey } = useCopyToClipboard(100);

    await handleCopyWithKey('sql', 'SELECT * FROM users');

    expect(copyToClipboard).toHaveBeenCalledWith('SELECT * FROM users');
    expect(copiedStates.value.sql).toBe(true);
  });

  it('resets keyed copied state after delay', async () => {
    const { isCopied, handleCopyWithKey } = useCopyToClipboard(100);

    await handleCopyWithKey('json', '{"ok":true}');
    vi.advanceTimersByTime(100);

    expect(isCopied('json')).toBe(false);
  });

  it('returns false for unknown copied key', () => {
    const { isCopied } = useCopyToClipboard();
    expect(isCopied('missing')).toBe(false);
  });

  it('returns icon and class based on copied state', () => {
    const { getCopyIcon, getCopyIconClass } = useCopyToClipboard();

    expect(getCopyIcon(true)).toBe('hugeicons:tick-02');
    expect(getCopyIcon(false)).toBe('hugeicons:copy-01');
    expect(getCopyIconClass(true)).toBe('text-green-500');
    expect(getCopyIconClass(false)).toBe('text-muted-foreground');
  });

  it('returns tooltip based on copied state and custom label', () => {
    const { getCopyTooltip } = useCopyToClipboard();

    expect(getCopyTooltip(true, 'Copy SQL')).toBe('Copied!');
    expect(getCopyTooltip(false, 'Copy SQL')).toBe('Copy SQL');
  });
});
