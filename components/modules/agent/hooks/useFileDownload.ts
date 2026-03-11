import { toast } from 'vue-sonner';
import type { AgentExportFileResult } from '../types';

function decodeBase64(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function useFileDownload() {
  const downloadFile = async (result: AgentExportFileResult) => {
    if (import.meta.server) {
      return false;
    }

    if (result.error) {
      toast.error(result.error);
      return false;
    }

    try {
      const blob =
        result.encoding === 'base64'
          ? new Blob([decodeBase64(result.content)], { type: result.mimeType })
          : new Blob([result.content], { type: result.mimeType });

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = result.filename;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
      toast.success(`Downloaded ${result.filename}`);
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to download export file.';
      toast.error(message);
      return false;
    }
  };

  return {
    downloadFile,
  };
}
