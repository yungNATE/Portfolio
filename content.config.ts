import { defineCollection, defineContentConfig, z } from "@nuxt/content";

// ─────────────────────────────────────────────
// SOUS-SCHÉMAS RÉUTILISABLES
// ─────────────────────────────────────────────

const media = z.object({
  src: z.string(),
  alt: z.string(),
  legende: z.string().optional(),
  type: z.enum(["image", "video", "lottie"]).optional(),
});

const temoignage = z.object({
  citation: z.string(),
  auteur: z.string(),
  poste: z.string(),
  entreprise: z.string().optional(),
  lien: z.string().optional(),
});

const metrique = z.object({
  label: z.string(),      // ex: "Score Lighthouse"
  valeur: z.string(),     // ex: "98/100"
  avant: z.string().optional(), // pour montrer une progression
});

export default defineContentConfig({
  collections: {
    projets: defineCollection({
      type: "page",
      source: "projets/*.md",
      schema: z.object({

        // ── IDENTIFICATION ──────────────────────
        titre: z.string(),
        sousTitre: z.string().optional(),
        client: z.string().optional(),
        confidentiel: z.boolean().optional(),
        typeProjet: z.enum([
          "freelance",
          "salarie",
          "personnel",
          "academique",
          "open-source",
        ]),
        categorie: z.array(
          z.enum([
            "site-vitrine",
            "web-app",
            "e-commerce",
            "ux-ui",
            "branding",
            "accessibilite",
            "design-system",
            "autre",
          ])
        ),
        statut: z.enum(["en-cours", "termine", "en-pause", "archive"]),
        dateDebut: z.string(), // format ISO "2026-01"
        dateFin: z.string().optional(),
        duree: z.string().optional(),

        // ── PRÉSENTATION / STORYTELLING ─────────
        resume: z.string(), // pour les cards / la liste projets
        contexte: z.string().optional(),
        objectifs: z.array(z.string()).optional(),
        cible: z.string().optional(),
        monRole: z.string(),
        equipe: z
          .object({
            taille: z.number().optional(),
            composition: z.string().optional(),
          })
          .optional(),
        contraintes: z.array(z.string()).optional(),
        processus: z.array(z.string()).optional(),
        defis: z.array(z.string()).optional(),
        solutions: z.array(z.string()).optional(),
        resultats: z.array(metrique).optional(),
        apprentissages: z.array(z.string()).optional(),
        ameliorationsFutures: z.array(z.string()).optional(),

        // ── TECHNIQUE ────────────────────────────
        stackTechnique: z.array(z.string()),
        architecture: z.string().optional(),
        integrations: z.array(z.string()).optional(),
        accessibilite: z
          .object({
            niveau: z.string(), // "non-audite" | "partiel" | "AA" | "AAA" | "78% conformité"...
            details: z.string().optional(),
          })
          .optional(),
        performance: z.array(metrique).optional(),
        responsive: z.boolean().optional(),
        tests: z.array(z.string()).optional(),
        hebergement: z.string().optional(),

        // ── VISUELS / MÉDIAS ──────────────────────
        couverture: media.optional(),
        galerie: z.array(media).optional(),
        video: media.optional(),
        maquettesFigma: z.string().optional(),
        paletteCouleurs: z.array(z.string()).optional(),
        typographies: z.array(z.string()).optional(),

        // ── UX / DESIGN ────────────────────────────
        personas: z.array(z.string()).optional(),
        userFlow: media.optional(),
        wireframes: z.array(media).optional(),
        moodboard: media.optional(),
        designSystem: z.string().optional(),

        // ── LIENS ───────────────────────────────────
        liens: z
          .object({
            demo: z.string().optional(),
            repo: z.string().optional(),
            repoPrive: z.boolean().optional(),
            figma: z.string().optional(),
            caseStudyExterne: z.string().optional(),
            // Cas des projets touchant plusieurs sites clients (ex: TAD -> plusieurs portails)
            sitesExemples: z
              .array(
                z.object({
                  label: z.string(),
                  url: z.string(),
                })
              )
              .optional(),
          })
          .optional(),

        // ── SOCIAL PROOF ─────────────────────────────
        temoignages: z.array(temoignage).optional(),

        // ── ORGANISATION / AFFICHAGE PORTFOLIO ───────
        tags: z.array(z.string()),
        competencesMobilisees: z.array(z.string()).optional(),
        // 3 niveaux plutôt qu'un simple bool : "phare" = mis en avant,
        // "standard" = poids normal, "discret" = présent mais en retrait (ex: missions mineures)
        niveauImportance: z.enum(["phare", "standard", "discret"]).optional(),
        ordreAffichage: z.number().optional(),
        couleurAccent: z.string().optional(),
        langue: z.enum(["fr", "en", "fr-en"]).optional(),

        // ── SEO ────────────────────────────────────────
        seo: z
          .object({
            metaTitle: z.string().optional(),
            metaDescription: z.string().optional(),
            ogImage: z.string().optional(),
          })
          .optional(),

        // ── MÉTA INTERNE ─────────────────────────────
        visible: z.boolean().default(true),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
      }),
    }),

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
