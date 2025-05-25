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

  router: {
    options: {
      hashMode: true,
    },
  },
  app: {
    baseURL: './',
    // buildAssetsDir: '/',
  },
  hooks: {
    'prerender:routes'({ routes }) {
      routes.clear(); // Do not generate any routes (except the defaults)
    },
  },
  experimental: {
    appManifest: false,
  },
  nitro: {
    preset: 'node',
  },

  // experimental: {
  //   configSchema: false,
  //   noVueServer: true,
  // },

  // ssr: false,
  // app: {
  //   baseURL: './', // Use relative paths for all assets
  // },
  // router: {
  //   options: {
  //     hashMode: true,
  //   },
  // },

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
    classSuffix: '',
  },
  vite: {
    plugins: [tailwindcss()],
  },
  shadcn: shadcnConfig,
  icon: {
    // collections: ['material-icon-theme', 'hugeicons', 'logos', 'lucide'],
    provider: 'server',
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
