import { ref } from 'vue';

const isLoading = ref(false);

export const useAppLoading = () => {
  const start = () => {
    isLoading.value = true;
  };
  const finish = () => {
    isLoading.value = false;
  };
  return { isLoading, start, finish };
};
