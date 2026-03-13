import { onBeforeUnmount, ref, computed, type Ref } from 'vue';

export function useResponseNavigator({
  currentIndex,
  total,
  onNavigate,
}: {
  currentIndex: Ref<number>;
  total: Ref<number>;
  onNavigate: (index: number) => void;
}) {
  const toastMessage = ref('');
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  const canGoPrevious = computed(() => currentIndex.value > 0);
  const canGoNext = computed(() => currentIndex.value < total.value - 1);

  const showToast = (message: string) => {
    toastMessage.value = message;

    if (toastTimer) {
      clearTimeout(toastTimer);
    }

    toastTimer = setTimeout(() => {
      toastMessage.value = '';
    }, 1500);
  };

  const goTo = (index: number) => {
    if (index < 0 || index >= total.value) {
      return;
    }

    onNavigate(index);
  };

  const goPrevious = () => {
    if (!canGoPrevious.value) {
      showToast('Already at first response');
      return;
    }

    const nextIndex = currentIndex.value - 1;
    goTo(nextIndex);
    showToast('Previous response');
  };

  const goNext = () => {
    if (!canGoNext.value) {
      showToast('Already at last response');
      return;
    }

    const nextIndex = currentIndex.value + 1;
    goTo(nextIndex);
    showToast('Next response');
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      goPrevious();
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      goNext();
    }
  };

  onBeforeUnmount(() => {
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
  });

  return {
    canGoNext,
    canGoPrevious,
    goNext,
    goPrevious,
    handleKeydown,
    toastMessage,
  };
}
