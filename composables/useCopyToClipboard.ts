import { ref } from 'vue';
import { copyToClipboard } from '~/utils/common/copyData';

/**
 * Composable for managing copy-to-clipboard functionality with visual feedback.
 * Provides a unified pattern for copy buttons with "Copied!" state.
 *
 * @example
 * ```ts
 * // Single copy target
 * const { copied, handleCopy } = useCopyToClipboard();
 * await handleCopy(textToCopy);
 *
 * // Multiple copy targets
 * const { copiedStates, handleCopyWithKey } = useCopyToClipboard();
 * await handleCopyWithKey('sql', sqlText);
 * await handleCopyWithKey('json', jsonText);
 * ```
 */
export function useCopyToClipboard(resetDelayMs = 2000) {
  // Single target copy state
  const copied = ref(false);

  // Multiple targets copy states
  const copiedStates = ref<Record<string, boolean>>({});

  /**
   * Copy text to clipboard with single copied state
   */
  const handleCopy = async (text: string) => {
    await copyToClipboard(text);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, resetDelayMs);
  };

  /**
   * Copy text to clipboard with keyed copied state for multiple copy targets
   */
  const handleCopyWithKey = async (key: string, text: string) => {
    await copyToClipboard(text);
    copiedStates.value[key] = true;
    setTimeout(() => {
      copiedStates.value[key] = false;
    }, resetDelayMs);
  };

  /**
   * Check if a specific key is in copied state
   */
  const isCopied = (key: string): boolean => {
    return copiedStates.value[key] ?? false;
  };

  /**
   * Get icon name based on copied state
   */
  const getCopyIcon = (isCopiedState: boolean = copied.value): string => {
    return isCopiedState ? 'hugeicons:tick-02' : 'hugeicons:copy-01';
  };

  /**
   * Get icon class based on copied state
   */
  const getCopyIconClass = (isCopiedState: boolean = copied.value): string => {
    return isCopiedState ? 'text-green-500' : 'text-muted-foreground';
  };

  /**
   * Get tooltip text based on copied state
   */
  const getCopyTooltip = (
    isCopiedState: boolean = copied.value,
    label = 'Copy'
  ): string => {
    return isCopiedState ? 'Copied!' : label;
  };

  return {
    // Single target
    copied,
    handleCopy,

    // Multiple targets
    copiedStates,
    handleCopyWithKey,
    isCopied,

    // Helpers
    getCopyIcon,
    getCopyIconClass,
    getCopyTooltip,
  };
}
