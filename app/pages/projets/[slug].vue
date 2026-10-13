<script setup lang="ts">
import type { ProjetsCollectionItem } from "@nuxt/content";
import { projectCoverSrc } from "~/utils/projectCover";

/**
 * Étude de cas d'un projet : reprend tout le contenu du fichier
 * content/projets/<slug>.md, dont la modale n'affiche qu'un aperçu.
 * Chaque bloc n'est rendu que si le champ correspondant est renseigné.
 */

const route = useRoute();
const path = `/projets/${route.params.slug}`;

const { data: project } = await useAsyncData(`projet-${path}`, () =>
  queryCollection("projets")
    .where("path", "=", path)
    .where("visible", "=", true)
    .first(),
);

if (!project.value) {
  throw createError({
    statusCode: 404,
    statusMessage: "Projet introuvable",
    fatal: true,
  });
}

// Non nul : le cas contraire a levé une 404 ci-dessus.
const p = computed(() => project.value as ProjetsCollectionItem);

useSeoMeta({
  title: () => p.value.seo?.metaTitle ?? `${p.value.titre} | Nathan Martinigol`,
  description: () => p.value.seo?.metaDescription ?? p.value.resume,
  ogTitle: () => p.value.seo?.metaTitle ?? p.value.titre,
  ogDescription: () => p.value.seo?.metaDescription ?? p.value.resume,
  ogImage: () => p.value.seo?.ogImage ?? projectCoverSrc(p.value),
});
useHead({ htmlAttrs: { lang: "fr" } });

// ── Mise en forme ───────────────────────────────────────────────────

const TYPE_LABELS: Record<ProjetsCollectionItem["typeProjet"], string> = {
  freelance: "Freelance",
  salarie: "Salarié",
  personnel: "Projet personnel",
  academique: "Projet académique",
  "open-source": "Open source",
};

const STATUT_LABELS: Record<ProjetsCollectionItem["statut"], string> = {
  "en-cours": "En cours",
  termine: "Terminé",
  "en-pause": "En pause",
  archive: "Archivé",
};

// "2024-09" -> "sept. 2024", "2024" -> "2024".
function formatDate(value: string) {
  const [year, month] = value.split("-");
  if (!month) return year;
  return new Date(Number(year), Number(month) - 1).toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
  });
}

const periode = computed(() => {
  const { dateDebut, dateFin, statut } = p.value;
  const debut = formatDate(dateDebut);
  if (dateFin) {
    const fin = formatDate(dateFin);
    return fin === debut ? debut : `${debut} → ${fin}`;
  }
  return statut === "en-cours" ? `${debut} → aujourd'hui` : debut;
});

const facts = computed(() =>
  [
    { label: "Client", value: p.value.client },
    { label: "Période", value: periode.value },
    { label: "Durée", value: p.value.duree },
    { label: "Cadre", value: TYPE_LABELS[p.value.typeProjet] },
    { label: "Statut", value: STATUT_LABELS[p.value.statut] },
    {
      label: "Équipe",
      value: p.value.equipe?.taille
        ? `${p.value.equipe.taille} personne${p.value.equipe.taille > 1 ? "s" : ""}`
        : undefined,
    },
  ].filter((fact): fact is { label: string; value: string } => !!fact.value),
);

const links = computed(() => {
  const liens = p.value.liens;
  const figma = liens?.figma ?? p.value.maquettesFigma;
  return [
    liens?.demo && { label: "Voir le site", href: liens.demo },
    // Un repo privé n'est pas consultable : pas de lien.
    liens?.repo && !liens.repoPrive && { label: "Code source", href: liens.repo },
    figma && { label: "Maquettes Figma", href: figma },
    liens?.caseStudyExterne && {
      label: "Étude de cas complète",
      href: liens.caseStudyExterne,
    },
  ].filter((link): link is { label: string; href: string } => !!link);
});

// Les exemples qui doublonnent le lien "Voir le site" sont ignorés.
const sitesExemples = computed(() =>
  (p.value.liens?.sitesExemples ?? []).filter(
    (site) => site.url !== p.value.liens?.demo,
  ),
);

// Défis et solutions côte à côte quand les deux existent.
const hasDefisSolutions = computed(
  () => !!(p.value.defis?.length || p.value.solutions?.length),
);

const hasBody = computed(() => {
  const body = p.value.body as { value?: unknown[] } | undefined;
  return !!body?.value?.length;
});

const accent = computed(() => p.value.couleurAccent ?? "#ff0073");
</script>

<template>
  <main class="case-study" :style="{ '--accent': accent }">
    <nav class="case-study__nav" aria-label="Navigation">
      <NuxtLink to="/#work" class="case-study__back">
        <span aria-hidden="true">←</span> Tous les projets
      </NuxtLink>
    </nav>

    <article class="case-study__article">
      <header class="case-study__hero">
        <SectionHeading :eyebrow="p.tags.slice(0, 3).join(' · ')" :level="1">
          {{ p.titre }}
        </SectionHeading>
        <p v-if="p.sousTitre" class="case-study__subtitle">{{ p.sousTitre }}</p>

        <dl v-if="facts.length" class="case-study__facts">
          <div v-for="fact in facts" :key="fact.label">
            <dt>{{ fact.label }}</dt>
            <dd>{{ fact.value }}</dd>
          </div>
        </dl>

        <p v-if="p.confidentiel" class="case-study__notice">
          Projet confidentiel : certains détails ne peuvent pas être partagés.
        </p>
      </header>

      <figure class="case-study__cover">
        <NuxtImg
          :src="projectCoverSrc(p)"
          :alt="p.couverture?.alt ?? ''"
          sizes="100vw md:1100px"
          format="webp"
          loading="eager"
        />
        <figcaption v-if="p.couverture?.legende">
          {{ p.couverture.legende }}
        </figcaption>
      </figure>

      <div class="case-study__layout">
        <div class="case-study__main">
          <section class="case-study__block case-study__lead">
            <p>{{ p.resume }}</p>
          </section>

          <section v-if="p.contexte" class="case-study__block">
            <h2>Contexte</h2>
            <p>{{ p.contexte }}</p>
            <p v-if="p.cible" class="case-study__muted">
              <strong>Cible :</strong> {{ p.cible }}
            </p>
          </section>

          <section v-if="p.objectifs?.length" class="case-study__block">
            <h2>Objectifs</h2>
            <ul class="case-study__list">
              <li v-for="item in p.objectifs" :key="item">{{ item }}</li>
            </ul>
          </section>

          <section class="case-study__block">
            <h2>Mon rôle</h2>
            <p>{{ p.monRole }}</p>
            <p v-if="p.equipe?.composition" class="case-study__muted">
              {{ p.equipe.composition }}
            </p>
          </section>

          <section v-if="p.contraintes?.length" class="case-study__block">
            <h2>Contraintes</h2>
            <ul class="case-study__list">
              <li v-for="item in p.contraintes" :key="item">{{ item }}</li>
            </ul>
          </section>

          <section v-if="p.processus?.length" class="case-study__block">
            <h2>Démarche</h2>
            <ol class="case-study__steps">
              <li v-for="item in p.processus" :key="item">{{ item }}</li>
            </ol>
          </section>

          <section v-if="hasDefisSolutions" class="case-study__block">
            <h2>Défis &amp; solutions</h2>
            <div class="case-study__split">
              <div v-if="p.defis?.length">
                <h3>Défis</h3>
                <ul class="case-study__list">
                  <li v-for="item in p.defis" :key="item">{{ item }}</li>
                </ul>
              </div>
              <div v-if="p.solutions?.length">
                <h3>Solutions</h3>
                <ul class="case-study__list">
                  <li v-for="item in p.solutions" :key="item">{{ item }}</li>
                </ul>
              </div>
            </div>
          </section>

          <section
            v-if="p.resultats?.length || p.performance?.length"
            class="case-study__block"
          >
            <h2>Résultats</h2>
            <ul class="case-study__metrics">
              <li
                v-for="metric in [...(p.resultats ?? []), ...(p.performance ?? [])]"
                :key="metric.label"
              >
                <span class="case-study__metric-label">{{ metric.label }}</span>
                <span class="case-study__metric-value">{{ metric.valeur }}</span>
                <span v-if="metric.avant" class="case-study__metric-before">
                  avant : {{ metric.avant }}
                </span>
              </li>
            </ul>
          </section>

          <section v-if="p.galerie?.length" class="case-study__block">
            <h2>Galerie</h2>
            <div class="case-study__gallery">
              <figure v-for="media in p.galerie" :key="media.src">
                <video
                  v-if="media.type === 'video'"
                  :src="media.src"
                  :aria-label="media.alt"
                  controls
                  preload="metadata"
                />
                <NuxtImg
                  v-else
                  :src="media.src"
                  :alt="media.alt"
                  sizes="100vw md:700px"
                  format="webp"
                  loading="lazy"
                />
                <figcaption v-if="media.legende">{{ media.legende }}</figcaption>
              </figure>
            </div>
          </section>

          <section v-if="p.temoignages?.length" class="case-study__block">
            <h2>Ils en parlent</h2>
            <figure
              v-for="temoignage in p.temoignages"
              :key="temoignage.auteur"
              class="case-study__quote"
            >
              <blockquote>
                <p>{{ temoignage.citation }}</p>
              </blockquote>
              <figcaption>
                <strong>{{ temoignage.auteur }}</strong>,
                {{ temoignage.poste
                }}<template v-if="temoignage.entreprise">
                  — {{ temoignage.entreprise }}</template
                >
              </figcaption>
            </figure>
          </section>

          <section v-if="p.apprentissages?.length" class="case-study__block">
            <h2>Ce que j'en retiens</h2>
            <ul class="case-study__list">
              <li v-for="item in p.apprentissages" :key="item">{{ item }}</li>
            </ul>
          </section>

          <section v-if="p.ameliorationsFutures?.length" class="case-study__block">
            <h2>Pistes d'amélioration</h2>
            <ul class="case-study__list">
              <li v-for="item in p.ameliorationsFutures" :key="item">
                {{ item }}
              </li>
            </ul>
          </section>

          <section v-if="hasBody" class="case-study__block case-study__prose">
            <ContentRenderer :value="p" />
          </section>
        </div>

        <aside class="case-study__aside">
          <section v-if="links.length || sitesExemples.length">
            <h2>Liens</h2>
            <ul class="case-study__links">
              <li v-for="link in links" :key="link.href">
                <a
                  class="external"
                  :href="link.href"
                  target="_blank"
                  rel="noopener noreferrer"
                  >{{ link.label }}</a
                >
              </li>
              <li v-for="site in sitesExemples" :key="site.url">
                <a
                  class="external"
                  :href="site.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  >{{ site.label }}</a
                >
              </li>
            </ul>
          </section>

          <section v-if="p.stackTechnique.length">
            <h2>Stack</h2>
            <ul class="case-study__pills">
              <li v-for="tech in p.stackTechnique" :key="tech">{{ tech }}</li>
            </ul>
          </section>

          <section v-if="p.competencesMobilisees?.length">
            <h2>Compétences</h2>
            <ul class="case-study__pills">
              <li v-for="skill in p.competencesMobilisees" :key="skill">
                {{ skill }}
              </li>
            </ul>
          </section>

          <section v-if="p.accessibilite">
            <h2>Accessibilité</h2>
            <p>
              <strong>{{ p.accessibilite.niveau }}</strong>
            </p>
            <p v-if="p.accessibilite.details" class="case-study__muted">
              {{ p.accessibilite.details }}
            </p>
          </section>

          <section v-if="p.architecture || p.hebergement">
            <h2>Technique</h2>
            <p v-if="p.architecture">{{ p.architecture }}</p>
            <p v-if="p.hebergement" class="case-study__muted">
              Hébergement : {{ p.hebergement }}
            </p>
          </section>
        </aside>
      </div>
    </article>

    <footer class="case-study__footer">
      <NuxtLink to="/#work" class="case-study__back">
        <span aria-hidden="true">←</span> Tous les projets
      </NuxtLink>
      <NuxtLink to="/#contact" class="anchor">Discutons de votre projet</NuxtLink>
    </footer>
  </main>
</template>

<style lang="scss" scoped>
.case-study {
  --surface: rgb(20, 20, 18);
  --text: #fff8f2;
  --line: rgba(255, 255, 255, 0.15);

  min-height: 100%;
  padding: clamp(1rem, 4vw, 3rem);
  background: var(--surface);
  color: var(--text);

  a {
    color: inherit;

    &:focus-visible {
      outline: 2px solid rgba(255, 255, 255, 0.7);
      outline-offset: 3px;
    }
  }

  p {
    margin: 0;
    line-height: 1.6;
  }
}

.case-study__nav,
.case-study__article,
.case-study__footer {
  max-width: 1100px;
  margin-inline: auto;
}

.case-study__back {
  span {
    display: inline-block;
    transition: transform 200ms ease;
  }

  &:hover span {
    transform: translateX(-3px);
  }
}

// ── En-tête ─────────────────────────────────────────────────────────

.case-study__hero {
  display: grid;
  gap: 1.25rem;
  padding-block: clamp(2rem, 6vw, 4rem) 2rem;

  :deep(.section-heading__eyebrow) {
    color: var(--accent);
    opacity: 1;
  }

  :deep(.section-title) {
    font-size: clamp(2rem, 5vw, 3.75rem);
    hyphens: auto;
  }
}

.case-study__subtitle {
  max-width: 60ch;
  font-size: 1.15rem;
  opacity: 0.8;
}

.case-study__facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem 2rem;
  margin: 1rem 0 0;
  padding-top: 1.5rem;
  border-top: 1px solid var(--line);

  dt {
    margin-bottom: 0.25rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 0.7rem;
    opacity: 0.6;
  }

  dd {
    margin: 0;
    line-height: 1.4;
  }
}

.case-study__notice {
  padding: 0.75rem 1rem;
  border-left: 3px solid var(--accent);
  background: rgba(255, 255, 255, 0.05);
  font-size: 0.9rem;
}

.case-study__cover {
  margin: 0;
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid var(--line);

  img {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 7;
    object-fit: cover;
  }

  figcaption {
    padding: 0.75rem 1rem;
    font-size: 0.85rem;
    opacity: 0.7;
  }
}

// ── Corps ───────────────────────────────────────────────────────────

.case-study__layout {
  display: grid;
  gap: 3rem;
  padding-block: 3rem;

  @media (min-width: 900px) {
    grid-template-columns: minmax(0, 1fr) 300px;
    align-items: start;
  }
}

.case-study__main {
  display: grid;
  gap: 3rem;
  min-width: 0;
}

.case-study__block {
  display: grid;
  gap: 1rem;
  max-width: 70ch;

  h2 {
    margin: 0;
    font-size: clamp(1.4rem, 2.5vw, 1.9rem);
  }

  h3 {
    margin: 0 0 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 0.75rem;
    opacity: 0.75;
  }
}

.case-study__lead p {
  font-size: clamp(1.1rem, 2vw, 1.35rem);
  line-height: 1.5;
}

.case-study__muted {
  opacity: 0.7;
}

.case-study__list {
  display: grid;
  gap: 0.6rem;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    position: relative;
    padding-left: 1.25rem;
    line-height: 1.55;

    &::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0.6em;
      width: 0.45rem;
      height: 0.45rem;
      border-radius: 50%;
      background: var(--accent);
    }
  }
}

.case-study__steps {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: step;

  li {
    display: grid;
    grid-template-columns: 2.25rem 1fr;
    gap: 0.75rem;
    line-height: 1.55;
    counter-increment: step;

    &::before {
      content: counter(step, decimal-leading-zero);
      color: var(--accent);
      font-weight: 800;
    }
  }
}

.case-study__split {
  display: grid;
  gap: 1.5rem;

  @media (min-width: 700px) {
    grid-template-columns: 1fr 1fr;
  }
}

.case-study__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: grid;
    gap: 0.4rem;
    align-content: start;
    padding: 1.25rem;
    border-radius: 16px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.04);
  }
}

.case-study__metric-label {
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-size: 0.7rem;
  opacity: 0.7;
}

.case-study__metric-value {
  font-weight: 700;
  line-height: 1.35;
}

.case-study__metric-before {
  font-size: 0.85rem;
  opacity: 0.6;
}

.case-study__gallery {
  display: grid;
  gap: 1.5rem;

  figure {
    margin: 0;
  }

  img,
  video {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 16px;
  }

  figcaption {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    opacity: 0.7;
  }
}

.case-study__quote {
  margin: 0;
  padding-left: 1.25rem;
  border-left: 3px solid var(--accent);

  blockquote {
    margin: 0 0 0.75rem;
    font-size: 1.1rem;
    font-style: italic;
  }

  figcaption {
    font-size: 0.9rem;
    opacity: 0.8;
  }
}

.case-study__prose {
  :deep(p + p) {
    margin-top: 1rem;
  }
}

// ── Colonne latérale ────────────────────────────────────────────────

.case-study__aside {
  display: grid;
  gap: 2rem;

  @media (min-width: 900px) {
    position: sticky;
    top: 2rem;
  }

  section {
    display: grid;
    gap: 0.75rem;
  }

  h2 {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 0.72rem;
    opacity: 0.75;
  }
}

.case-study__links {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.case-study__pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    padding: 0.32rem 0.65rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    font-size: 0.85rem;
  }
}

// ── Pied ────────────────────────────────────────────────────────────

.case-study__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 2rem;
  border-top: 1px solid var(--line);
}
</style>
