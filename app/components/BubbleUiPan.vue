<template>
  <div
    ref="rootEl"
    class="bubble-pan"
    :class="{ 'is-panning': isPanning }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="endPointer"
    @pointercancel="endPointer"
    @lostpointercapture.self="endPointer"
    @click.capture="onClickCapture"
    @dragstart.prevent
    @focusin="onFocusIn"
  >
    <BubbleUi
      v-if="options"
      :key="bubbleKey"
      :items="items"
      :options="options"
    >
      <template #item="{ item, bubble }">
        <slot name="item" :item="item" :bubble="bubble" :size="options.size" />
      </template>
    </BubbleUi>
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { BubbleUi, type BubbleUiProps } from "vue-bubble-ui";

/**
 * Adaptateur autour de vue-bubble-ui (utilisée telle quelle, non modifiée).
 *
 * Il ajoute :
 * - des options responsive, calculées depuis la taille réelle du conteneur ;
 * - le pan à la souris / au stylet (Pointer Events) vers le scroll interne
 *   de BubbleUi, qui recalcule lui-même taille et position des bulles ;
 * - la distinction clic / drag (seuil de DRAG_THRESHOLD px) ;
 * - le recentrage de la bulle qui reçoit le focus clavier.
 *
 * Au touch, le navigateur a la priorité : le conteneur interne est un
 * `overflow: scroll` natif, il gère le pan au doigt (avec l'inertie) et
 * envoie un `pointercancel` dès qu'il prend la main, ce qui arrête notre pan
 * JS. Le même code sert donc à tous les types de pointeur, sans
 * `touch-action: none` qui bloquerait l'inertie et le scroll de la page.
 */

const props = defineProps<{
  items: T[];
  /** Change quand le contenu change (ex. filtre) : remonte et recentre BubbleUi. */
  contentKey?: string;
}>();

const emit = defineEmits<{
  (e: "pan-start"): void;
  (e: "pan-end"): void;
}>();

const DRAG_THRESHOLD = 5;

type Tier = Required<
  Pick<BubbleUiProps, "size" | "minSize" | "gutter" | "numCols" | "fringeWidth">
>;

// Choisi d'après la plus petite dimension du conteneur. La frange (zone où
// les bulles rétrécissent jusqu'à minSize) vaut une taille de bulle.
const TIERS: { maxSide: number; options: Tier }[] = [
  {
    maxSide: 480,
    options: { size: 110, minSize: 24, gutter: 10, numCols: 3, fringeWidth: 110 },
  },
  {
    maxSide: 760,
    options: { size: 150, minSize: 28, gutter: 14, numCols: 4, fringeWidth: 150 },
  },
  {
    maxSide: Infinity,
    options: { size: 190, minSize: 32, gutter: 18, numCols: 5, fringeWidth: 190 },
  },
];

// Part de la demi-dimension du conteneur où les bulles restent à pleine
// taille : au-delà, elles rétrécissent (effet Bubble UI) et la grille
// déborde, ce qui donne de l'amplitude au pan.
const RADIUS_RATIO = 0.5;
const RADIUS_STEP = 20;

const rootEl = ref<HTMLElement | null>(null);
const containerSize = ref<{ width: number; height: number } | null>(null);

function computeOptions(width: number, height: number): BubbleUiProps {
  const tier = TIERS.find((t) => Math.min(width, height) <= t.maxSide)!.options;

  // BubbleUi positionne la grille avec `calc(50% - (radius + size/2 - …))` :
  // si le rayon dépasse la demi-dimension du conteneur moins size/2, ce calc
  // devient négatif et le calcul des tailles se décale. Arrondi pour ne pas
  // remonter le composant à chaque pixel de resize.
  const radius = (half: number) => {
    const max = Math.max(0, half - tier.size / 2);
    const r = Math.floor((half * RADIUS_RATIO) / RADIUS_STEP) * RADIUS_STEP;
    return Math.min(r, max);
  };
  const xRadius = radius(width / 2);
  const yRadius = radius(height / 2);

  return {
    ...tier,
    xRadius,
    yRadius,
    cornerRadius: Math.min(tier.size / 2, xRadius, yRadius),
    gravitation: 5,
    compact: true,
  };
}

// BubbleUi copie ses options une seule fois au setup (elles ne sont pas
// réactives) : pour en changer, il faut le remonter via `key`.
const options = computed(() =>
  containerSize.value
    ? computeOptions(containerSize.value.width, containerSize.value.height)
    : null,
);

const bubbleKey = computed(() => {
  const o = options.value;
  return o
    ? `${o.size}-${o.xRadius}-${o.yRadius}|${props.contentKey ?? ""}`
    : "";
});

/**
 * Compromis : BubbleUi n'expose ni ref ni événement vers son conteneur
 * scrollable. On le récupère une seule fois par montage via sa classe interne
 * `.scrollable` (détail d'implémentation de vue-bubble-ui 1.0.x, à revérifier
 * lors d'une mise à jour de la lib). Jamais interrogé pendant un pointermove.
 */
let scroller: HTMLElement | null = null;

watch(
  bubbleKey,
  () => {
    scroller = rootEl.value?.querySelector<HTMLElement>(".scrollable") ?? null;
    if (scroller) {
      // Pas de scroll-chaining vers la page quand on atteint un bord.
      scroller.style.overscrollBehavior = "contain";
    }
  },
  { flush: "post" },
);

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (!rootEl.value) return;
  resizeObserver = new ResizeObserver(([entry]) => {
    if (!entry) return;
    const { width, height } = entry.contentRect;
    if (width > 0 && height > 0) containerSize.value = { width, height };
  });
  resizeObserver.observe(rootEl.value);
});

// ── Pan ─────────────────────────────────────────────────────────────

const isPanning = ref(false);

let pointerId: number | null = null;
let startX = 0;
let startY = 0;
let startScrollLeft = 0;
let startScrollTop = 0;
let pendingX = 0;
let pendingY = 0;
let frame = 0;
let suppressClick = false;

function onPointerDown(event: PointerEvent) {
  if (!event.isPrimary || event.button !== 0 || !scroller) return;
  pointerId = event.pointerId;
  startX = event.clientX;
  startY = event.clientY;
  startScrollLeft = scroller.scrollLeft;
  startScrollTop = scroller.scrollTop;
  suppressClick = false;
}

function onPointerMove(event: PointerEvent) {
  if (event.pointerId !== pointerId || !scroller) return;

  const dx = event.clientX - startX;
  const dy = event.clientY - startY;

  if (!isPanning.value) {
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    isPanning.value = true;
    // Au touch/stylet, la bulle touchée détient une capture implicite : la
    // lui prendre lui fait émettre un lostpointercapture qui remonte jusqu'ici,
    // d'où le `.self` sur ce listener (sinon le pan s'arrêterait aussitôt).
    rootEl.value?.setPointerCapture(event.pointerId);
    window.getSelection()?.removeAllRanges();
    emit("pan-start");
  }

  pendingX = startScrollLeft - dx;
  pendingY = startScrollTop - dy;
  if (!frame) frame = requestAnimationFrame(applyScroll);
}

function applyScroll() {
  frame = 0;
  // Le navigateur clampe aux bornes et émet `scroll`, que BubbleUi écoute.
  scroller?.scrollTo(pendingX, pendingY);
}

function endPointer(event: PointerEvent) {
  if (event.pointerId !== pointerId) return;
  pointerId = null;
  if (!isPanning.value) return;

  isPanning.value = false;
  // Le `click` éventuel arrive juste après le pointerup : on le neutralise.
  suppressClick = event.type === "pointerup";
  if (rootEl.value?.hasPointerCapture(event.pointerId)) {
    rootEl.value.releasePointerCapture(event.pointerId);
  }
  emit("pan-end");
}

function onClickCapture(event: MouseEvent) {
  if (!suppressClick) return;
  suppressClick = false;
  event.preventDefault();
  event.stopPropagation();
}

// ── Clavier ─────────────────────────────────────────────────────────

// Les bulles hors du centre sont minuscules : on ramène celle qui prend le
// focus clavier au centre pour qu'elle soit lisible (BubbleUi la regrossit).
// Pas au clic souris, pour ne pas déplacer la grille sous le curseur.
function onFocusIn(event: FocusEvent) {
  const target = event.target as HTMLElement | null;
  if (!scroller || !target || !target.matches(":focus-visible")) return;

  const box = scroller.getBoundingClientRect();
  const rect = target.getBoundingClientRect();
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  scroller.scrollBy({
    left: rect.left + rect.width / 2 - (box.left + box.width / 2),
    top: rect.top + rect.height / 2 - (box.top + box.height / 2),
    behavior: reduceMotion ? "auto" : "smooth",
  });
}

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  if (frame) cancelAnimationFrame(frame);
  scroller = null;
});
</script>

<style lang="scss" scoped>
.bubble-pan {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: grab;

  &.is-panning {
    cursor: grabbing;
    user-select: none;
  }
}
</style>
