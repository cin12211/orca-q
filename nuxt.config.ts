import tailwindcss from '@tailwindcss/vite';
import type { DefineNuxtConfig, NuxtConfig } from 'nuxt/config';

// https://nuxt.com/docs/api/configuration/nuxt-config

const appHeaderConfig: NonNullable<NuxtConfig['app']>['head'] = {
  htmlAttrs: {
    lang: 'en',
  },
  meta: [
    {
      name: 'viewport',
      content:
        'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
    },
    { name: 'theme-color', content: '#FAFAFA' },
    // Apple PWA
    { name: 'apple-mobile-web-app-capable', content: 'no' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    { name: 'apple-mobile-web-app-title', content: 'ChiaXien' },
  ],

  link: [{ rel: 'manifest', href: '/manifest.json' }],
};

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
      amplitudeApiKey: process.env.NUXT_AMPLITUDE_API_KEY,
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
  css: ['~/assets/css/tailwind.css', 'vue-json-pretty/lib/styles.css'],
  colorMode: {
    preference: 'light',
    fallback: 'light',
    globalName: '__NUXT_COLOR_MODE__',
    componentName: 'ColorScheme',
    storage: 'cookie',
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
  app: {
    head: appHeaderConfig,
  },
});
