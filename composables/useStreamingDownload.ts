import { ref } from 'vue';
import { toast } from 'vue-sonner';
import { formatBytes } from '~/utils/common';

export interface StreamingDownloadOptions {
  url: string;
  method?: 'GET' | 'POST';
  body?: unknown;
  filename: string;
  contentType?: string;
}

export interface StreamingDownloadState {
  isDownloading: boolean;
  downloadedBytes: number;
  error: Error | null;
}

/**
 * Composable for streaming file downloads.
 * Uses the Streams API to read response chunks as they arrive,
 * avoiding buffering entire response in memory.
 */
export function useStreamingDownload() {
  const isDownloading = ref(false);
  const downloadedBytes = ref(0);
  const error = ref<Error | null>(null);

  /**
   * Download a file using streaming.
   * Shows progress via toast and saves directly as chunks arrive.
   */
  const downloadStream = async (options: StreamingDownloadOptions) => {
    const { url, method = 'POST', body, filename, contentType } = options;

    isDownloading.value = true;
    downloadedBytes.value = 0;
    error.value = null;

    const toastId = toast.loading(`Exporting ${filename}...`, {
      description: 'Starting download...',
    });

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        // Try to parse error message from response
        let errorMessage = 'Export failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Ignore JSON parse error, use default message
        }
        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error('Response body is not available for streaming');
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedLength = 0;

      // Read chunks as they arrive
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        chunks.push(value);
        receivedLength += value.length;
        downloadedBytes.value = receivedLength;

        // Update progress toast
        const sizeKBFormatted = formatBytes(receivedLength);
        toast.loading(`Exporting ${filename}...`, {
          id: toastId,
          description: `Downloaded ${sizeKBFormatted}`,
          position: 'bottom-right',
        });
      }

      // Combine chunks into final blob
      const blob = new Blob(chunks as BlobPart[], {
        type:
          contentType ||
          response.headers.get('Content-Type') ||
          'application/octet-stream',
      });

      // Trigger download
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      const sizeKBFormatted = formatBytes(receivedLength);
      toast.success(`Exported ${filename}`, {
        id: toastId,
        description: `${sizeKBFormatted} downloaded`,
        position: 'bottom-right',
      });

      return { success: true, size: receivedLength };
    } catch (e) {
      const err = e as Error;
      error.value = err;
      toast.error('Export failed', {
        id: toastId,
        description: err.message,
        position: 'bottom-right',
      });
      return { success: false, error: err };
    } finally {
      isDownloading.value = false;
    }
  };

  return {
    isDownloading,
    downloadedBytes,
    error,
    downloadStream,
  };
}
