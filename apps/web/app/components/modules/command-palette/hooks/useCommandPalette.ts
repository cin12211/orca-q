import { ref } from 'vue';

const isCommandPaletteOpen = ref(false);

export function useCommandPalette() {
  const openCommandPalette = () => {
    isCommandPaletteOpen.value = true;
  };

  const closeCommandPalette = () => {
    isCommandPaletteOpen.value = false;
  };

  const toggleCommandPalette = () => {
    isCommandPaletteOpen.value = !isCommandPaletteOpen.value;
  };

  return {
    isCommandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,
  };
}
