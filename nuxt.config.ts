// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  css: ["@/assets/css/reset.css", "@/assets/css/global.scss"],
  modules: ["@nuxt/fonts", "@nuxt/content"],

  ssr: true,
  nitro: {
    preset: "static",
  },

  debug: true,

  experimental: {
    debugModuleMutation: true,
  },

  devtools: {
    enabled: true,
  },

  sourcemap: {
    server: true,
    client: true,
  },
});
