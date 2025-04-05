import tailwindcss from "@tailwindcss/vite";
import type { DefineNuxtConfig } from "nuxt/config";

// https://nuxt.com/docs/api/configuration/nuxt-config

const shadcnConfig: Parameters<DefineNuxtConfig>[number]["shadcn"] = {
  /**
   * Prefix for all the imported component
   */
  prefix: "",
  /**
   * Directory that the component lives in.
   * @default "./components/ui"
   */
  componentDir: "./components/ui",
};

export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  ssr: false,
  modules: ["@nuxt/icon", "shadcn-nuxt"],
  css: ["~/assets/css/tailwind.css"],
  vite: {
    plugins: [tailwindcss()],
  },
  shadcn: shadcnConfig,
  icon: {
    collections: ["hugeicons", "logos"],
  },
  imports: {
    autoImport: true,
  },
});
