export default defineNuxtPlugin(nuxtApp => {
  // Move Amplitude initialization from app.vue to here
  const { initialize } = useAmplitude();

  if (import.meta.client) {
    console.log('[Analytics Plugin] Initializing Amplitude tracking.');
    initialize();
  }
});
