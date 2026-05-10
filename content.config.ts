import { defineCollection, defineContentConfig, z } from "@nuxt/content";

export default defineContentConfig({
  collections: {
    technos: defineCollection({
      type: "page",
      source: "technos/*.md",
      schema: z.object({
        title: z.string(),
        category: z.string(),
        priority: z.number().optional(),
        level: z.string().optional(),
        description: z.string().optional(),
      }),
    }),
  },
});
