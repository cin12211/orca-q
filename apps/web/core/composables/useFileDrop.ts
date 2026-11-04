import { ref } from 'vue';

export function useFileDrop(onFileRead?: (content: string) => void) {
  const isDragging = ref(false);

  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    isDragging.value = true;
  };

  const onDragLeave = () => {
    isDragging.value = false;
  };

  const onDrop = async (event: DragEvent) => {
    event.preventDefault();
    isDragging.value = false;

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = e => {
      const content = e.target?.result as string;
      if (onFileRead) {
        onFileRead(content);
      }
    };

    reader.readAsText(file);
  };

  return {
    isDragging,
    onDragOver,
    onDragLeave,
    onDrop,
  };
}
