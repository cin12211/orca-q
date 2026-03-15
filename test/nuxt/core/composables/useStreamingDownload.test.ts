import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'vue-sonner';
import { useStreamingDownload } from '~/core/composables/useStreamingDownload';
import { formatBytes } from '~/core/helpers';

vi.mock('vue-sonner', () => ({
  toast: {
    loading: vi.fn().mockReturnValue('toast-id'),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('~/core/helpers', () => ({
  formatBytes: vi.fn((size: number) => `${size} B`),
}));

const createStreamingResponse = (chunks: Uint8Array[]) => {
  const read = vi.fn();

  chunks.forEach(chunk => {
    read.mockResolvedValueOnce({ done: false, value: chunk });
  });

  read.mockResolvedValueOnce({ done: true, value: undefined });

  return {
    ok: true,
    body: {
      getReader: () => ({ read }),
    },
    headers: {
      get: vi.fn().mockReturnValue('application/json'),
    },
  };
};

describe('useStreamingDownload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://download');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('starts with default state', () => {
    const { isDownloading, downloadedBytes, error } = useStreamingDownload();

    expect(isDownloading.value).toBe(false);
    expect(downloadedBytes.value).toBe(0);
    expect(error.value).toBeNull();
  });

  it('downloads stream successfully and returns size', async () => {
    const response = createStreamingResponse([
      new Uint8Array([1, 2]),
      new Uint8Array([3]),
    ]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    const { downloadStream } = useStreamingDownload();
    const result = await downloadStream({
      url: '/api/export',
      filename: 'rows.json',
      body: { limit: 10 },
    });

    expect(result).toEqual({ success: true, size: 3 });
  });

  it('updates downloaded bytes during successful stream', async () => {
    const response = createStreamingResponse([new Uint8Array([1, 2, 3, 4])]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    const { downloadStream, downloadedBytes } = useStreamingDownload();
    await downloadStream({ url: '/api/export', filename: 'rows.json' });

    expect(downloadedBytes.value).toBe(4);
    expect(formatBytes).toHaveBeenCalledWith(4);
  });

  it('shows success toast on completed download', async () => {
    const response = createStreamingResponse([new Uint8Array([1])]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    const { downloadStream } = useStreamingDownload();
    await downloadStream({ url: '/api/export', filename: 'rows.json' });

    expect(toast.success).toHaveBeenCalled();
  });

  it('returns error when server responds with failure payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ message: 'Permission denied' }),
      })
    );

    const { downloadStream } = useStreamingDownload();
    const result = await downloadStream({
      url: '/api/export',
      method: 'GET',
      filename: 'rows.csv',
    });

    expect(result.success).toBe(false);
    expect((result as any).error.message).toBe('Permission denied');
  });

  it('returns error when response body is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: null,
        headers: { get: vi.fn() },
      })
    );

    const { downloadStream } = useStreamingDownload();
    const result = await downloadStream({
      url: '/api/export',
      filename: 'rows.csv',
    });

    expect(result.success).toBe(false);
    expect((result as any).error.message).toContain(
      'Response body is not available'
    );
  });

  it('handles fetch exceptions and stores error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down'))
    );

    const { downloadStream, error, isDownloading } = useStreamingDownload();
    const result = await downloadStream({
      url: '/api/export',
      filename: 'rows.csv',
    });

    expect(result.success).toBe(false);
    expect(error.value?.message).toBe('network down');
    expect(isDownloading.value).toBe(false);
    expect(toast.error).toHaveBeenCalled();
  });

  it('passes request method and body to fetch', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(createStreamingResponse([new Uint8Array([1])])) as any;
    vi.stubGlobal('fetch', fetchMock);

    const { downloadStream } = useStreamingDownload();
    await downloadStream({
      url: '/api/export',
      method: 'POST',
      body: { page: 2 },
      filename: 'rows.csv',
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page: 2 }),
    });
  });
});
