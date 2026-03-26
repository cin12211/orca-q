export default defineNuxtPlugin(nuxtApp => {
  // Global handler for Vue component errors
  nuxtApp.vueApp.config.errorHandler = (error, instance, info) => {
    console.error('[Vue Error]:', { error, info, instance });
    // Optional: Report to external service (Sentry, LogRocket, etc.)
  };

  // Global handler for Nuxt-specific errors
  nuxtApp.hook('app:error', error => {
    console.error('[App Error]:', error);
  });

  // Global handler for unhandled promise rejections
  if (import.meta.client) {
    window.addEventListener('unhandledrejection', event => {
      console.error('[Unhandled Rejection]:', event.reason);
    });
  }
});
