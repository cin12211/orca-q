import tailwindcss from '@tailwindcss/vite';
import type { DefineNuxtConfig } from 'nuxt/config';

// https://nuxt.com/docs/api/configuration/nuxt-config

const shadcnConfig: Parameters<DefineNuxtConfig>[number]['shadcn'] = {
  /**
   * Prefix for all the imported component
   */
  prefix: '',
  /**
   * Directory that the component lives in.
   * @default "./components/ui"
   */
  componentDir: './components/ui',
};

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',

  ssr: false,

  runtimeConfig: {
    public: {
      //TODO: move this to env
      amplitudeApiKey: 'f6ca565b6cac8b973b4df623e04a7968',
    },
  },

  devtools: {
    enabled: true,

    timeline: {
      enabled: true,
    },
  },
  modules: [
    'shadcn-nuxt',
    '@nuxt/icon',
    '@nuxtjs/color-mode',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    'nuxt-typed-router',
    '@formkit/auto-animate',
  ],
  css: ['~/assets/css/tailwind.css'],
  colorMode: {
    preference: 'no-preference',
    fallback: 'light',
    globalName: '__NUXT_COLOR_MODE__',
    componentName: 'ColorScheme',
    classPrefix: '',
    classSuffix: '',
    storage: 'localStorage',
    storageKey: 'nuxt-color-mode',
  },
  vite: {
    plugins: [tailwindcss()],
  },
  shadcn: shadcnConfig,
  icon: {
    // collections: ['material-icon-theme', 'hugeicons', 'logos', 'lucide'],
    provider: 'iconify',
  },
  imports: {
    autoImport: true,
  },
  components: [
    { path: '~/components/base', pathPrefix: false },

    '~/components',
  ],
  piniaPluginPersistedstate: {
    storage: 'localStorage',
  },
});
