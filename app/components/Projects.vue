<template>
  <div class="projects-grid" aria-labelledby="projects-title">
    <div class="projects-grid__intro">
      <header class="projects-grid__header">
        <div>
          <p class="projects-grid__eyebrow">Projets</p>
          <h2 id="projects-title" class="projects-grid__title">
            Grille filtrable
          </h2>
        </div>

        <p class="projects-grid__count" aria-live="polite">
          {{ resultsLabel }}
        </p>
      </header>

      <div
        class="projects-grid__filters"
        role="toolbar"
        aria-label="Filtrer les projets par tag"
      >
        <button
          type="button"
          class="projects-grid__filter"
          :class="{ 'is-active': activeTags.length === 0 }"
          :aria-pressed="activeTags.length === 0"
          @click="clearFilters"
        >
          Tous
        </button>

        <button
          v-for="tag in tagOptions"
          :key="tag"
          type="button"
          class="projects-grid__filter"
          :class="{ 'is-active': isTagActive(tag) }"
          :aria-pressed="isTagActive(tag)"
          @click="toggleTag(tag)"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <div
      v-if="filteredProjects.length"
      class="projects-grid__list"
      role="list"
      :aria-label="resultsLabel"
    >
      <!-- Dimensions et options dépendent du viewport : rendu client uniquement. -->
      <ClientOnly>
        <BubbleUiPan
          :items="filteredProjects"
          :content-key="filterKey"
          @pan-start="onCardLeave"
        >
          <template #item="{ item: project, size }">
            <div role="listitem" :style="{ width: `${size}px` }">
              <ProjectDot
                :project="project"
                aria-describedby="resume-tooltip"
                @open="openProject"
                @mouseenter="
                  ($event: MouseEvent) => {
                    onHoverPrefetch(project);
                    onCardEnter(project, $event);
                  }
                "
                @mousemove="onCardMove($event)"
                @mouseleave="onCardLeave"
                @focus="onCardFocus(project, $event)"
                @blur="onCardLeave"
              />
            </div>
          </template>
        </BubbleUiPan>

        <!-- Rendu serveur : garde les titres dans le HTML et fait rendre les
             mêmes images en SSR, pour que `nuxt generate` pré-génère leurs
             variantes _ipx (sinon 404 en preset static). -->
        <template #fallback>
          <ul class="sr-only">
            <li v-for="project in filteredProjects" :key="projectKey(project)">
              <ProjectDot :project="project" />
            </li>
          </ul>
        </template>
      </ClientOnly>
    </div>

    <p v-else class="projects-grid__empty">
      Aucun projet ne correspond au filtre actif.
    </p>
  </div>

  <Teleport to="body">
    <div
      v-if="hoveredProject"
      id="resume-tooltip"
      ref="tooltipEl"
      class="project-tooltip"
      role="status"
      aria-live="polite"
      :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }"
    >
      <span v-if="isResumeLoading(hoveredProject)">Chargement…</span>
      <span v-else>{{ resumeFor(hoveredProject) }}</span>
    </div>
  </Teleport>

  <ProjectModal
    :project="selectedProject"
    :origin="selectedOrigin"
    @close="closeProject"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, shallowRef, watch } from "vue";
import MurkyThumbnail from "./MurkyThumbnail.vue";
import type { ProjectItem } from "~/types/project";

type DecoratedProject = ProjectItem & { __index: number };

const { data: fetchedProjects } = await useAsyncData("projects-grid", () =>
  queryCollection("projets")
    .select(
      "path",
      "titre",
      // Infos affichées dès l'ouverture de la modale (et dans l'infobulle).
      "sousTitre",
      "resume",
      "tags",
      "couverture",
      "niveauImportance",
      "ordreAffichage",
      "visible",
    )
    .where("visible", "=", true)
    .all(),
);

const activeTags = ref<string[]>([]);

// Projet ouvert via un ProjectDot, affiché par ProjectModal qui s'anime
// depuis la bulle d'origine.
const selectedProject = ref<ProjectItem | null>(null);
const selectedOrigin = shallowRef<HTMLElement | null>(null);

function openProject(project: ProjectItem, origin: HTMLElement) {
  hoveredProject.value = null;
  selectedOrigin.value = origin;
  selectedProject.value = project;
}

function closeProject() {
  selectedProject.value = null;
  selectedOrigin.value = null;
  // Le focus vient d'être rendu à la bulle : pas d'infobulle par-dessus.
  hoveredProject.value = null;
}

const hoveredProject = ref<ProjectItem | null>(null);
const tooltipPos = ref({ x: 0, y: 0 });
const tooltipEl = ref<HTMLElement | null>(null);
const rawCursor = ref({ x: 0, y: 0 });
const TOOLTIP_OFFSET = 18;

// Le résumé est désormais dans le fetch initial (utilisé par la modale) ;
// ce cache à la demande ne sert plus que de repli s'il manque.
const resumeCache = ref<Record<string, string>>({});
const resumeLoading = ref<Record<string, boolean>>({});

function projectKey(project: ProjectItem) {
  return project.path ?? project.titre;
}

function isResumeLoading(project: ProjectItem) {
  return !!resumeLoading.value[projectKey(project)];
}

function resumeFor(project: ProjectItem) {
  return project.resume ?? resumeCache.value[projectKey(project)] ?? "";
}

async function ensureResumeLoaded(project: ProjectItem) {
  const key = projectKey(project);
  if (
    project.resume !== undefined ||
    key in resumeCache.value || resumeLoading.value[key] || !project.path) {
    return;
  }
  resumeLoading.value[key] = true;
  try {
    // .first() à vérifier contre la version de @nuxt/content installée
    const result = await queryCollection("projets")
      .select("resume")
      .where("path", "=", project.path)
      .first();
    resumeCache.value[key] = result?.resume ?? "";
  } finally {
    resumeLoading.value[key] = false;
  }
}

// Déclenché sur la zone élargie (quelques pixels avant le survol réel de
// la carte visible) pour que la requête ait une longueur d'avance.
function onHoverPrefetch(project: ProjectItem) {
  ensureResumeLoaded(project);
}

let resumeResizeObserver: ResizeObserver | null = null;

watch(tooltipEl, (el) => {
  resumeResizeObserver?.disconnect();
  resumeResizeObserver = null;
  if (el) {
    // Le contenu passe de "Chargement..." au résumé une fois arrivé : la
    // largeur naturelle change, donc on re-checke la position à ce
    // moment-là aussi, pas seulement au mousemove.
    resumeResizeObserver = new ResizeObserver(() => computeTooltipPosition());
    resumeResizeObserver.observe(el);
  }
});

onUnmounted(() => resumeResizeObserver?.disconnect());

function computeTooltipPosition() {
  const { x, y } = rawCursor.value;

  if (!tooltipEl.value) {
    tooltipPos.value = { x: x + TOOLTIP_OFFSET, y: y + TOOLTIP_OFFSET };
    return;
  }

  const { width, height } = tooltipEl.value.getBoundingClientRect();
  const spaceRight = window.innerWidth - x;
  const spaceBelow = window.innerHeight - y;

  tooltipPos.value = {
    x:
      spaceRight < width
        ? x - width - TOOLTIP_OFFSET // pas assez de place à droite -> bascule à gauche du curseur
        : x + TOOLTIP_OFFSET,
    y:
      spaceBelow < height
        ? y - height - TOOLTIP_OFFSET // pas assez de place en bas -> bascule au-dessus
        : y + TOOLTIP_OFFSET,
  };
}

function positionFromEvent(event: MouseEvent) {
  rawCursor.value = { x: event.clientX, y: event.clientY };
  computeTooltipPosition();
}

function onCardEnter(project: ProjectItem, event: MouseEvent) {
  hoveredProject.value = project;
  ensureResumeLoaded(project); // filet de sécurité si le prefetch n'était pas parti
  rawCursor.value = { x: event.clientX, y: event.clientY };
  nextTick(computeTooltipPosition); // le tooltip vient de v-if apparaître, pas encore mesurable avant
}

function onCardMove(event: MouseEvent) {
  if (!hoveredProject.value) return;
  positionFromEvent(event);
}

function onCardLeave() {
  hoveredProject.value = null;
}

function onCardFocus(project: ProjectItem, event: FocusEvent) {
  hoveredProject.value = project;
  ensureResumeLoaded(project);
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  rawCursor.value = { x: rect.left, y: rect.bottom + 12 };
  nextTick(computeTooltipPosition);
}

function normalizeTag(tag: string) {
  return tag.trim().toLowerCase();
}

function sortProjects(items: ProjectItem[]) {
  const decorated = items.map((item, index) => ({ ...item, __index: index }));
  const hasExplicitOrder = decorated.some(
    (item) => typeof item.ordreAffichage === "number",
  );

  if (!hasExplicitOrder) {
    return decorated;
  }

  return decorated.sort((left, right) => {
    const leftHasOrder = typeof left.ordreAffichage === "number";
    const rightHasOrder = typeof right.ordreAffichage === "number";

    if (leftHasOrder && rightHasOrder) {
      const orderDelta =
        (left.ordreAffichage ?? 0) - (right.ordreAffichage ?? 0);
      return orderDelta !== 0 ? orderDelta : left.__index - right.__index;
    }

    if (leftHasOrder !== rightHasOrder) {
      return leftHasOrder ? -1 : 1;
    }

    return left.__index - right.__index;
  });
}

const projects = computed<DecoratedProject[]>(() => {
  const items = fetchedProjects.value ?? [];

  return sortProjects(items as ProjectItem[]) as DecoratedProject[];
});

const tagOptions = computed(() => {
  const tags = new Map<string, string>();

  projects.value.forEach((project) => {
    project.tags.forEach((tag) => {
      const normalized = normalizeTag(tag);

      if (!tags.has(normalized)) {
        tags.set(normalized, tag);
      }
    });
  });

  return Array.from(tags.values());
});

const activeTagSet = computed(
  () => new Set(activeTags.value.map((tag) => normalizeTag(tag))),
);

const filteredProjects = computed(() => {
  if (activeTagSet.value.size === 0) {
    return projects.value;
  }

  return projects.value.filter((project) =>
    project.tags.some((tag) => activeTagSet.value.has(normalizeTag(tag))),
  );
});

// Change avec le filtre : BubbleUi est remonté et recentré sur le nouveau set.
const filterKey = computed(() =>
  filteredProjects.value.map((project) => projectKey(project)).join("|"),
);

const resultsLabel = computed(() => {
  const count = filteredProjects.value.length;
  return `${count} projet${count > 1 ? "s" : ""}`;
});

function isTagActive(tag: string) {
  return activeTagSet.value.has(normalizeTag(tag));
}

function toggleTag(tag: string) {
  const normalized = normalizeTag(tag);

  if (activeTagSet.value.has(normalized)) {
    activeTags.value = activeTags.value.filter(
      (currentTag) => normalizeTag(currentTag) !== normalized,
    );
    return;
  }

  activeTags.value = [...activeTags.value, tag];
}

function clearFilters() {
  activeTags.value = [];
}

function importanceLabel(project: ProjectItem) {
  switch (project.niveauImportance) {
    case "phare":
      return "Projet phare";
    case "discret":
      return "Projet discret";
    default:
      return "Projet standard";
  }
}
</script>

<style lang="scss" scoped>
.projects-grid {
  display: flex;
  align-items: flex-start;
  gap: clamp(2rem, 5vw, 4rem);
  width: max-content;
  color: #fff8f2;

  align-items: stretch;
  height: 100%;
}

.projects-grid__intro {
  align-self: flex-start;
  flex: 0 0 auto;
  max-width: 700px;
  display: grid;
  gap: 1.5rem;
}

.projects-grid__header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.projects-grid__eyebrow {
  margin: 0 0 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.72rem;
  opacity: 0.75;
}

.projects-grid__title {
  margin: 0;
  font-size: clamp(2rem, 4vw, 4rem);
  line-height: 0.95;
}

.projects-grid__count {
  margin: 0;
  padding: 0.6rem 0.9rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
}

.projects-grid__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.projects-grid__filter {
  appearance: none;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  border-radius: 999px;
  padding: 0.6rem 0.95rem;
  font: inherit;
  cursor: pointer;
  transition:
    background-color 0.25s ease,
    transform 0.25s ease,
    border-color 0.25s ease;

  &:hover,
  &:focus-visible {
    transform: translateY(-1px);
    border-color: rgba(255, 255, 255, 0.4);
    outline: none;
  }

  &.is-active {
    background: rgba(255, 255, 255, 0.22);
    border-color: rgba(255, 255, 255, 0.55);
  }
}

// Zone Bubble UI : ses dimensions pilotent les options responsive de
// BubbleUiPan (taille des bulles, rayons), mesurées par ResizeObserver.
.projects-grid__list {
  flex: 0 0 auto;
  width: min(80vw, 1200px);
  height: 100%;
  min-height: 0;
}

// Même critère que le passage en `.is-portrait` du scroll horizontal
// (ratio <= 1) : sections empilées, la Bubble UI prend toute la largeur.
@media (max-aspect-ratio: 1/1) {
  .projects-grid {
    flex-direction: column;
    width: 100%;
  }

  .projects-grid__intro {
    max-width: none;
  }

  .projects-grid__list {
    width: 100%;
    height: 70svh;
    min-height: 360px;
  }
}

.project-card__importance {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.72;
}

.project-tooltip {
  position: fixed;
  z-index: 60;
  max-width: 20rem;
  padding: 0.7rem 1rem;
  border-radius: 14px;
  background: rgba(20, 20, 18, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  color: #fff8f2;
  font-size: 0.88rem;
  line-height: 1.5;
  pointer-events: none;
}

.projects-grid__empty {
  margin: 0;
  padding: 1.2rem 0;
  opacity: 0.85;
}
</style>
