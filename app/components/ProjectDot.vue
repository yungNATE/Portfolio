<template>
  <button
    type="button"
    class="project-dot"
    :class="[
      `is-${project.niveauImportance ?? 'standard'}`,
      { 'is-pressed': pressed },
    ]"
    :aria-label="`Ouvrir le projet ${project.titre}`"
    @pointerdown="onPointerDown"
    @pointerup="release"
    @pointercancel="release"
    @pointerleave="release"
    @lostpointercapture="release"
    @click="onClick"
  >
    <!-- Décorative : le nom accessible vient de aria-label. -->
    <NuxtImg
      v-bind="PROJECT_DOT_IMAGE"
      class="project-dot__image"
      :src="coverSrc"
      alt=""
      draggable="false"
    />

    <span class="project-dot__content">
      <span v-if="project.tags[0]" class="project-dot__tag">
        {{ project.tags[0] }}
      </span>
      <span class="project-dot__title" lang="fr">{{ project.titre }}</span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { ProjectItem } from "~/types/project";
import { PROJECT_DOT_IMAGE, projectCoverSrc } from "~/utils/projectCover";

/**
 * Un projet sous forme de dot : apparence et ouverture uniquement.
 *
 * Le dot remplit la largeur de son parent (carré), c'est au parent de le
 * dimensionner. Le positionnement, le pan et la distinction clic / drag sont
 * gérés plus haut (BubbleUi / BubbleUiPan).
 */

const props = defineProps<{
  project: ProjectItem;
}>();

const emit = defineEmits<{
  // `origin` : le dot lui-même, point de départ de l'animation d'ouverture.
  (e: "open", project: ProjectItem, origin: HTMLElement): void;
}>();

const coverSrc = computed(() => projectCoverSrc(props.project));

// État "pressé" tant que le pointeur est enfoncé sur le dot. Si un pan
// démarre, le wrapper capture le pointeur : le dot reçoit pointerleave /
// lostpointercapture et se relâche, sans avoir à connaître le pan.
const pressed = ref(false);

function onPointerDown(event: PointerEvent) {
  if (event.button === 0) pressed.value = true;
}

function release() {
  pressed.value = false;
}

function onClick(event: MouseEvent) {
  emit("open", props.project, event.currentTarget as HTMLElement);
}
</script>

<style lang="scss" scoped>
.project-dot {
  position: relative;
  display: block;
  inline-size: 100%;
  aspect-ratio: 1;
  padding: 0;
  overflow: hidden;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.14);
  color: #fff8f2;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  // Les textes se dimensionnent sur la taille du dot (unités cqi).
  container-type: inline-size;
  transition:
    transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    filter 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease;

  &:hover,
  &:focus-visible {
    transform: scale(1.05);
    border-color: rgba(255, 255, 255, 0.55);
    box-shadow:
      0 16px 40px rgba(0, 0, 0, 0.14),
      0 0 24px rgba(255, 255, 255, 0.25);
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.7);
    outline-offset: 3px;
  }

  // Après :hover pour l'emporter. Enfoncement rapide ; au relâchement, la
  // transition par défaut reprend avec un léger rebond.
  &.is-pressed {
    transform: scale(0.9);
    filter: brightness(0.9);
    transition-duration: 0.1s;
    transition-timing-function: ease-out;
  }

  &.is-phare {
    border: 2px solid rgba(255, 255, 255, 0.45);
  }

  &.is-discret {
    opacity: 0.8;
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover,
    &:focus-visible,
    &.is-pressed {
      transform: none;
    }
  }
}

.project-dot__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.85);
  transition: filter 0.25s ease;
  -webkit-user-drag: none;

  .project-dot:hover &,
  .project-dot:focus-visible & {
    filter: brightness(1);
  }
}

.project-dot__content {
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
}

.project-dot__tag {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: clamp(0.5rem, 5cqi, 0.72rem);
  opacity: 0.75;
}

.project-dot__title {
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

// Petits dots : le titre seul, le tag deviendrait illisible.
@container (max-width: 130px) {
  .project-dot__tag {
    display: none;
  }
}
</style>
