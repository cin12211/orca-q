import { ref, watch, onUnmounted, type Ref } from 'vue';

export interface UseSmoothStreamOptions {
  /**
   * Higher values mean smoother but slower catching up.
   * Lower values mean faster catching up to the source text.
   * Default: 10
   */
  speed?: number;
}

export function useSmoothStream(
  sourceText: Ref<string>,
  isStreaming: Ref<boolean | undefined>,
  options: UseSmoothStreamOptions = {}
) {
  const speed = options.speed ?? 10;
  const displayedText = ref(sourceText.value || '');
  let animationFrameId: number | null = null;

  const tick = () => {
    if (displayedText.value.length < sourceText.value.length) {
      const diff = sourceText.value.length - displayedText.value.length;

      // Calculate how many characters to add based on the distance.
      // If we are very far behind (e.g. initial load or massive chunk),
      // jump ahead to avoid infinitely lagging typing animations.
      const charsToAdd = Math.max(1, Math.ceil(diff / speed));

      displayedText.value = sourceText.value.slice(
        0,
        displayedText.value.length + charsToAdd
      );

      if (displayedText.value.length < sourceText.value.length) {
        animationFrameId = requestAnimationFrame(tick);
      } else {
        animationFrameId = null;
      }
    } else {
      animationFrameId = null;
    }
  };

  watch(
    sourceText,
    (newText, oldText) => {
      if (!isStreaming.value) {
        // Snap to full text when streaming is finished
        displayedText.value = newText || '';
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        return;
      }

      const newTextStr = newText || '';

      // If text was reset or drastically changed, reset displayed text instantly
      if (!oldText || !newTextStr.startsWith(displayedText.value)) {
        displayedText.value = newTextStr;
        return;
      }

      if (!animationFrameId && displayedText.value.length < newTextStr.length) {
        animationFrameId = requestAnimationFrame(tick);
      }
    },
    { immediate: true }
  );

  // Snap to final text when streaming ends, even if sourceText didn't change.
  // This prevents the animation from being stuck mid-way when the last chunk
  // arrived but the RAF loop hasn't caught up yet.
  watch(isStreaming, streaming => {
    if (!streaming) {
      displayedText.value = sourceText.value || '';
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    }
  });

  onUnmounted(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });

  return displayedText;
}
