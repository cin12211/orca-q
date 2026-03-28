import tailwindcss from '@tailwindcss/vite';
import type { DefineNuxtConfig, NuxtConfig } from 'nuxt/config';
import pkg from './package.json';

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
    { name: 'apple-mobile-web-app-title', content: 'OrcaQ' },
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

const devWatchIgnored = [
  '**/.git/**',
  '**/node_modules/**',
  '**/.nuxt/**',
  '**/.output/**',
  '**/.data/**',
  '**/.cache/**',
  '**/.vite/**',
  '**/dist/**',
  '**/coverage/**',
  '**/playwright-report/**',
  '**/test-results/**',
  '**/storybook-static/**',
  '**/.electron-build/**',
  '**/.electron-out/**',
  '**/electron-dist/**',
  '**/npx-package/.output/**',
  '**/orcaq-mcp/dist/**',
  '**/src-tauri/target/**',
  '**/src-tauri/gen/**',
];

const componentDirs = [
  {
    path: '~/components',
    pathPrefix: false,
    extensions: ['vue'],
  },
];

const isTauriDev = process.env.NUXT_TAURI_DEV === '1';

const devWatchOptions = {
  ignored: devWatchIgnored,
  ...(isTauriDev
    ? {
        usePolling: true,
        interval: 150,
        binaryInterval: 300,
      }
    : {}),
};

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',

  ssr: false,
  telemetry: false,

  devServer: {
    host: '0.0.0.0',
    port: 3000,
  },

  runtimeConfig: {
    public: {
      amplitudeApiKey: process.env.NUXT_AMPLITUDE_API_KEY,
      isDev: process.env.NODE_ENV !== 'production',
      version: pkg.version,
    },
  },

  devtools: {
    enabled: !isTauriDev,

    timeline: {
      enabled: !isTauriDev,
    },
  },
  modules: [
    // '@nuxt/test-utils/module',
    'shadcn-nuxt',
    '@nuxt/icon',
    '@nuxtjs/color-mode',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    'nuxt-typed-router',
    '@formkit/auto-animate',
    // '@nuxtjs/storybook',
    // 'nuxt-mcp-dev',
  ],
  css: ['~/assets/css/tailwind.css', 'vue-json-pretty/lib/styles.css'],
  colorMode: {
    preference: 'light',
    fallback: 'light',
    classSuffix: '',
    globalName: '__NUXT_COLOR_MODE__',
    componentName: 'ColorScheme',
    storage: 'localStorage',
    storageKey: 'nuxt-color-mode',
  },
  vite: {
    clearScreen: false,
    envPrefix: ['VITE_', 'TAURI_'],
    plugins: [tailwindcss()],
    server: {
      strictPort: true,
      watch: devWatchOptions,
    },
  },
  shadcn: shadcnConfig,
  icon: {
    serverBundle: 'local',
    clientBundle: {
      scan: true,
    },
    provider: 'iconify',
    customCollections: [
      {
        prefix: 'icons',
        dir: './assets/icons',
      },
    ],
  },
  imports: {
    autoImport: true,
    dirs: ['core/composables'],
  },
  components: {
    dirs: componentDirs,
  },
  piniaPluginPersistedstate: {
    storage: 'localStorage',
  },
  app: {
    head: appHeaderConfig,
  },
  watch: ['app.vue', 'nuxt.config.ts'],
  watchers: {
    chokidar: devWatchOptions,
  },
  ignore: ['**/src-tauri/**', '**/electron/**', '**/docs/**'],
  spaLoadingTemplate: true,
});
