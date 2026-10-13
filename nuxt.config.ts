// https://nuxt.com/docs/api/configuration/nuxt-config
import { readFileSync, readdirSync } from "node:fs";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  css: ["@/assets/css/reset.css", "@/assets/css/global.scss"],
  modules: ["@nuxt/fonts", "@nuxt/content", "@nuxt/image"],

  ssr: true,
  nitro: {
    preset: "static",
    prerender: {
      // Les études de cas ne sont liées que depuis la modale (rendue côté
      // client) : le crawler ne les trouve pas, on les liste ici. Les projets
      // masqués (visible: false) renverraient une 404 : on les écarte.
      routes: readdirSync("content/projets")
        .filter(
          (file) =>
            file.endsWith(".md") &&
            !/^visible:\s*false/m.test(
              readFileSync(`content/projets/${file}`, "utf-8"),
            ),
        )
        .map((file) => `/projets/${file.replace(/\.md$/, "")}`),
    },
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
