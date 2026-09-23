<template>
  <dialog
    ref="dialogEl"
    class="project-modal"
    :aria-labelledby="titleId"
    @cancel.prevent="close"
    @close="onNativeClose"
  >
    <div ref="backdropEl" class="project-modal__backdrop" @click="close" />

    <div v-if="project" ref="panelEl" class="project-modal__panel">
      <!-- Zone image : au départ, elle occupe tout le panneau et reproduit la
           bulle ; elle se réduit ensuite à sa hauteur finale en révélant le
           contenu placé dessous. -->
      <div ref="mediaEl" class="project-modal__media">
        <!-- Vignette de la bulle, déjà en cache : visible immédiatement. -->
        <NuxtImg
          v-bind="PROJECT_DOT_IMAGE"
          loading="eager"
          class="project-modal__image"
          :src="coverSrc"
          alt=""
        />
        <!-- Pleine résolution, chargée à l'ouverture, en fondu une fois prête. -->
        <img
          class="project-modal__image project-modal__image--full"
          :class="{ 'is-loaded': fullImageLoaded }"
          :src="coverSrc"
          :alt="project.couverture?.alt ?? ''"
          decoding="async"
          @load="fullImageLoaded = true"
        />

        <!-- Même rendu que ProjectDot, pour que le départ soit la bulle. -->
        <div ref="overlayEl" class="project-modal__overlay" aria-hidden="true">
          <span v-if="project.tags[0]" class="project-modal__overlay-tag">
            {{ project.tags[0] }}
          </span>
          <span class="project-modal__overlay-title" lang="fr">
            {{ project.titre }}
          </span>
        </div>
      </div>

      <div ref="bodyEl" class="project-modal__body">
        <div
          ref="innerEl"
          class="project-modal__inner"
          :aria-busy="loading"
        >
          <header>
            <h2 :id="titleId" class="project-modal__title">
              {{ project.titre }}
            </h2>
            <p v-if="project.sousTitre" class="project-modal__subtitle">
              {{ project.sousTitre }}
            </p>
          </header>

          <ul
            v-if="project.tags.length"
            class="project-modal__pills"
            aria-label="Tags"
          >
            <li v-for="tag in project.tags" :key="tag">{{ tag }}</li>
          </ul>

          <p v-if="project.resume" class="project-modal__resume">
            {{ project.resume }}
          </p>

          <template v-if="details">
            <section>
              <h3 class="project-modal__eyebrow">Mon rôle</h3>
              <p>{{ details.monRole }}</p>
            </section>

            <section v-if="details.stackTechnique.length">
              <h3 class="project-modal__eyebrow">Stack</h3>
              <ul class="project-modal__pills">
                <li v-for="tech in details.stackTechnique" :key="tech">
                  {{ tech }}
                </li>
              </ul>
            </section>

            <section v-if="links.length">
              <h3 class="project-modal__eyebrow">Liens</h3>
              <ul class="project-modal__links">
                <li v-for="link in links" :key="link.href">
                  <a
                    class="external"
                    :href="link.href"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {{ link.label }}
                  </a>
                </li>
              </ul>
            </section>
          </template>

          <p v-else-if="loadError" class="project-modal__status">
            Impossible de charger le détail du projet.
          </p>

          <template v-else>
            <p class="sr-only">Chargement du détail du projet…</p>
            <div class="project-modal__skeleton" aria-hidden="true">
              <span class="skeleton skeleton--eyebrow" />
              <span class="skeleton skeleton--line" />
              <span class="skeleton skeleton--line skeleton--short" />
              <span class="skeleton skeleton--eyebrow" />
              <span class="project-modal__skeleton-pills">
                <span v-for="n in 4" :key="n" class="skeleton skeleton--pill" />
              </span>
            </div>
          </template>
        </div>
      </div>

      <button
        ref="closeEl"
        type="button"
        class="project-modal__close"
        aria-label="Fermer"
        autofocus
        @click="close"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import gsap from "gsap";
import type { ProjetsCollectionItem } from "@nuxt/content";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  shallowRef,
  useId,
  watch,
} from "vue";
import type { ProjectItem } from "~/types/project";
import { PROJECT_DOT_IMAGE, projectCoverSrc } from "~/utils/projectCover";

/**
 * Fiche d'un projet. Le panneau démarre comme une copie exacte de la bulle
 * cliquée (`origin`) : image plein cadre, contenu présent mais de hauteur
 * nulle. En grandissant (avec rebond), la zone image se réduit à sa hauteur
 * finale et révèle le contenu. À la fermeture, le chemin inverse.
 *
 * Titre, sous-titre, tags et résumé arrivent avec le projet (fetch initial) ;
 * rôle, stack et liens sont chargés à l'ouverture, avec un skeleton.
 *
 * `<dialog>` natif en showModal() : focus piégé, fond inerte, Échap géré par
 * le navigateur (on intercepte `cancel` pour jouer l'animation de fermeture).
 */

const props = defineProps<{
  project: ProjectItem | null;
  origin: HTMLElement | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

type ProjectDetails = Pick<
  ProjetsCollectionItem,
  "monRole" | "stackTechnique" | "liens"
>;

const titleId = useId();

const dialogEl = ref<HTMLDialogElement | null>(null);
const backdropEl = ref<HTMLElement | null>(null);
const panelEl = ref<HTMLElement | null>(null);
const mediaEl = ref<HTMLElement | null>(null);
const overlayEl = ref<HTMLElement | null>(null);
const bodyEl = ref<HTMLElement | null>(null);
const innerEl = ref<HTMLElement | null>(null);
const closeEl = ref<HTMLElement | null>(null);

const coverSrc = computed(() =>
  props.project ? projectCoverSrc(props.project) : "",
);
const fullImageLoaded = ref(false);

// ── Détails secondaires, chargés à l'ouverture ──────────────────────

const detailsCache = new Map<string, ProjectDetails>();
const details = shallowRef<ProjectDetails | null>(null);
const loading = ref(false);
const loadError = ref(false);

async function loadDetails(project: ProjectItem) {
  details.value = null;
  loadError.value = false;
  if (!project.path) {
    loadError.value = true;
    return;
  }

  const cached = detailsCache.get(project.path);
  if (cached) {
    details.value = cached;
    return;
  }

  loading.value = true;
  try {
    const result = await queryCollection("projets")
      .select("monRole", "stackTechnique", "liens")
      .where("path", "=", project.path)
      .first();
    if (!result) throw new Error(`Projet introuvable : ${project.path}`);
    detailsCache.set(project.path, result);
    // Ignore une réponse arrivée après la fermeture ou un autre projet.
    if (props.project?.path === project.path) details.value = result;
  } catch (error) {
    console.error(error);
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

const links = computed(() => {
  const liens = details.value?.liens;
  if (!liens) return [];
  return [
    liens.demo && { label: "Voir le site", href: liens.demo },
    // Un repo privé n'est pas consultable : pas de lien.
    liens.repo && !liens.repoPrive && { label: "Code source", href: liens.repo },
    liens.figma && { label: "Maquettes Figma", href: liens.figma },
  ].filter((link): link is { label: string; href: string } => !!link);
});

// ── Animation ───────────────────────────────────────────────────────

const PANEL_RADIUS = 24;
const OPEN = { duration: 0.65, ease: "back.out(1.3)" }; // dépasse puis se pose
const CLOSE = { duration: 0.45, ease: "power3.inOut" };

let timeline: gsap.core.Timeline | null = null;
let unlockScroll: (() => void) | null = null;
let active = false; // ouvert et pas encore nettoyé
let closing = false;

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function rectOf(el: HTMLElement) {
  const { left, top, width, height } = el.getBoundingClientRect();
  return { left, top, width, height };
}

watch(
  () => props.project,
  async (project) => {
    if (!project) return;
    fullImageLoaded.value = false;
    loadDetails(project);
    await nextTick(); // le panneau vient d'être rendu
    open();
  },
);

// Pendant le morph, le contenu est mis en page à sa largeur finale (pas de
// reflow du texte à chaque frame), centré, et mis à l'échelle du panneau.
function freezeBody(width: number) {
  gsap.set(bodyEl.value, { overflow: "hidden" });
  gsap.set(innerEl.value, {
    width,
    marginLeft: "50%",
    xPercent: -50,
    transformOrigin: "50% 0",
  });
}

function releaseBody() {
  gsap.set(bodyEl.value, { clearProps: "overflow" });
  gsap.set(innerEl.value, { clearProps: "width,marginLeft,transform" });
}

function open() {
  const dialog = dialogEl.value;
  const panel = panelEl.value;
  const media = mediaEl.value;
  if (!dialog || !panel || !media) return;

  active = true;
  closing = false;
  unlockScroll = lockScroll({ id: "project-modal" });
  dialog.showModal();

  // Mise en page finale donnée par le CSS, mesurée avant d'animer.
  const to = rectOf(panel);
  const toMediaHeight = media.getBoundingClientRect().height;
  const origin = props.origin?.isConnected ? props.origin : null;
  const from = origin ? rectOf(origin) : null;
  // La bulle "devient" la modale : on masque l'originale pendant l'ouverture.
  if (origin) origin.style.visibility = "hidden";

  timeline?.kill();
  timeline = gsap.timeline();
  timeline.fromTo(backdropEl.value, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0);

  if (!from || prefersReducedMotion()) {
    gsap.set(overlayEl.value, { opacity: 0 });
    timeline.fromTo(panel, { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0);
    return;
  }

  freezeBody(to.width);
  timeline
    .fromTo(
      panel,
      { ...from, borderRadius: from.width / 2 },
      {
        ...to,
        borderRadius: PANEL_RADIUS,
        ...OPEN,
        clearProps: "left,top,width,height,borderRadius",
      },
      0,
    )
    // Image plein cadre -> hauteur finale : le contenu apparaît dessous.
    // (min-height levé : la bulle peut être plus petite que le minimum final.)
    .fromTo(
      media,
      { height: from.height, minHeight: 0, filter: "brightness(0.85)" },
      {
        height: toMediaHeight,
        filter: "brightness(1)",
        ...OPEN,
        clearProps: "height,minHeight,filter",
      },
      0,
    )
    // Même durée et même courbe que le panneau : l'échelle reste exactement
    // proportionnelle à sa largeur, le contenu grandit avec lui sans être rogné.
    .fromTo(
      innerEl.value,
      { scale: from.width / to.width },
      { scale: 1, ...OPEN },
      0,
    )
    // Le titre de la bulle s'efface vite, avant de croiser le vrai titre.
    .fromTo(overlayEl.value, { opacity: 1 }, { opacity: 0, duration: 0.15 }, 0)
    .fromTo(
      closeEl.value,
      { opacity: 0, scale: 0.6 },
      { opacity: 1, scale: 1, duration: 0.3, clearProps: "opacity,transform" },
      0.4,
    )
    .add(releaseBody);
}

function close() {
  const panel = panelEl.value;
  const media = mediaEl.value;
  if (!active || closing || !panel || !media) return;
  closing = true;

  const from = rectOf(panel);
  const fromMediaHeight = media.getBoundingClientRect().height;
  const origin = props.origin?.isConnected ? props.origin : null;
  const to = origin ? rectOf(origin) : null;

  timeline?.kill();
  timeline = gsap.timeline({ onComplete: finish });
  timeline.to(closeEl.value, { opacity: 0, duration: 0.15 }, 0);
  timeline.to(backdropEl.value, { opacity: 0, duration: 0.3 }, 0.15);

  if (!to || prefersReducedMotion()) {
    timeline.to(panel, { opacity: 0, duration: 0.2 }, 0);
    return;
  }

  freezeBody(from.width);
  timeline
    .fromTo(
      panel,
      { ...from },
      { ...to, borderRadius: to.width / 2, ...CLOSE },
      0,
    )
    .fromTo(
      media,
      { height: fromMediaHeight, minHeight: 0 },
      { height: to.height, filter: "brightness(0.85)", ...CLOSE },
      0,
    )
    .fromTo(
      innerEl.value,
      { scale: 1 },
      { scale: to.width / from.width, ...CLOSE },
      0,
    )
    // Le titre de la bulle revient à la fin, quand elle a retrouvé sa taille.
    .to(overlayEl.value, { opacity: 1, duration: 0.15 }, CLOSE.duration - 0.15);
}

function finish() {
  teardown();
  dialogEl.value?.close();
}

// Aussi appelé si le navigateur ferme le dialog lui-même (ex. Échap répété).
function onNativeClose() {
  if (active) teardown();
}

function teardown() {
  if (!active) return;
  active = false;
  closing = false;
  timeline?.kill();
  timeline = null;

  gsap.set(
    [
      backdropEl.value,
      panelEl.value,
      mediaEl.value,
      overlayEl.value,
      bodyEl.value,
      innerEl.value,
      closeEl.value,
    ],
    { clearProps: "all" },
  );

  unlockScroll?.();
  unlockScroll = null;

  const origin = props.origin;
  if (origin) {
    origin.style.visibility = "";
    origin.focus({ preventScroll: true });
  }
  emit("close");
}

onBeforeUnmount(() => {
  if (!active) return;
  teardown();
  dialogEl.value?.close();
});
</script>

<style lang="scss" scoped>
.project-modal {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  background: transparent;
  color: #fff8f2;

  // Fond géré par .project-modal__backdrop (animable, cliquable).
  &::backdrop {
    background: transparent;
  }
}

.project-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(20, 20, 18, 0.6);
}

.project-modal__panel {
  --panel-width: min(760px, 100% - 2rem);
  --panel-height: min(680px, 100% - 2rem);

  position: absolute;
  left: calc((100% - var(--panel-width)) / 2);
  top: calc((100% - var(--panel-height)) / 2);
  display: flex;
  flex-direction: column;
  width: var(--panel-width);
  height: var(--panel-height);
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgb(20, 20, 18);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.14);
}

// ── Zone image ──────────────────────────────────────────────────────

.project-modal__media {
  position: relative;
  flex: 0 0 auto;
  height: 40%;
  min-height: 160px;
  overflow: hidden;
  // Textes du calque dimensionnés comme dans ProjectDot (unités cqi).
  container-type: inline-size;
}

.project-modal__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.project-modal__image--full {
  opacity: 0;
  transition: opacity 0.25s ease;

  &.is-loaded {
    opacity: 1;
  }
}

// Reprend le dégradé, le tag et le titre de ProjectDot.
.project-modal__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 0.3em;
  padding: 0 15% 17%;
  text-align: center;
  background: linear-gradient(transparent 35%, rgba(0, 0, 0, 0.75));
  pointer-events: none;
}

.project-modal__overlay-tag {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: clamp(0.5rem, 5cqi, 0.72rem);
  opacity: 0.75;
}

.project-modal__overlay-title {
  font-weight: 800;
  font-size: clamp(0.6rem, 7.5cqi, 0.95rem);
  line-height: 1.15;
  hyphens: auto;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}

@container (max-width: 130px) {
  .project-modal__overlay-tag {
    display: none;
  }
}

// ── Contenu ─────────────────────────────────────────────────────────

.project-modal__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.project-modal__inner {
  display: grid;
  gap: 1.5rem;
  padding: clamp(1.25rem, 4vw, 2.5rem);

  p {
    margin: 0;
    line-height: 1.55;
  }
}

.project-modal__title {
  margin: 0;
  font-size: clamp(1.5rem, 3.5vw, 2.25rem);
  line-height: 1.05;
}

.project-modal__subtitle {
  margin-top: 0.5rem !important;
  opacity: 0.75;
}

.project-modal__eyebrow {
  margin: 0 0 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.72rem;
  opacity: 0.75;
}

.project-modal__pills {
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

.project-modal__links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  margin: 0;
  padding: 0;
  list-style: none;

  a {
    color: inherit;

    &:focus-visible {
      outline: 2px solid rgba(255, 255, 255, 0.7);
      outline-offset: 3px;
    }
  }
}

.project-modal__status {
  opacity: 0.75;
}

// ── Skeleton ────────────────────────────────────────────────────────

.project-modal__skeleton {
  display: grid;
  gap: 0.6rem;
}

.project-modal__skeleton-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.skeleton {
  display: block;
  height: 0.9rem;
  border-radius: 999px;
  background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.08) 50%,
      transparent 100%
    )
    0 0 / 200% 100% no-repeat,
    rgba(255, 255, 255, 0.1);
  animation: skeleton-shimmer 1.4s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
}

.skeleton--eyebrow {
  width: 6rem;
  height: 0.6rem;
  margin-top: 0.9rem;

  &:first-child {
    margin-top: 0;
  }
}

.skeleton--line {
  width: 100%;
}

.skeleton--short {
  width: 60%;
}

.skeleton--pill {
  width: 4.5rem;
  height: 1.7rem;
}

@keyframes skeleton-shimmer {
  from {
    background-position: 150% 0, 0 0;
  }
  to {
    background-position: -50% 0, 0 0;
  }
}

// ── Fermer ──────────────────────────────────────────────────────────

.project-modal__close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(20, 20, 18, 0.7);
  color: inherit;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  transition:
    border-color 0.25s ease,
    transform 0.25s ease;

  &:hover,
  &:focus-visible {
    border-color: rgba(255, 255, 255, 0.7);
    transform: scale(1.05);
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.7);
    outline-offset: 3px;
  }
}
</style>
