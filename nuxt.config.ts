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
  devtools: { enabled: true },
  ssr: false,
  modules: [
    'shadcn-nuxt',
    '@nuxt/icon',
    '@nuxtjs/color-mode',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    'nuxt-typed-router',
    '@pinia-orm/nuxt',
    '@nuxt/image',
    '@formkit/auto-animate',
    '@nuxtjs/i18n',
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
