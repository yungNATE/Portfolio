<template>
  <div
    ref="rootEl"
    class="bubble-pan"
    :class="{ 'is-panning': isPanning, 'can-pan': panAxis }"
    :data-cursor="panAxis ? 'grab' : undefined"
    :data-cursor-axis="panAxis ?? undefined"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="endPointer"
    @pointercancel="endPointer"
    @lostpointercapture.self="endPointer"
    @click.capture="onClickCapture"
    @dragstart.prevent
    @focusin="onFocusIn"
    @touchstart.passive="isTouching = true"
    @touchend="isTouching = false"
    @touchcancel="isTouching = false"
  >
    <!-- Porte le masque des fondus : la pastille, à côté, n'est pas estompée. -->
    <div
      class="bubble-pan__viewport"
      :class="{
        'fade-top': overflow.top,
        'fade-bottom': overflow.bottom,
        'fade-left': overflow.left,
        'fade-right': overflow.right,
      }"
    >
      <BubbleUi v-if="options" :key="bubbleKey" :items="items" :options="options">
        <template #item="{ item, bubble }">
          <slot name="item" :item="item" :bubble="bubble" :size="options.size" />
        </template>
      </BubbleUi>
    </div>

    <!-- Indice tactile uniquement : à la souris, c'est le curseur custom
         (MagneticCursor, via data-cursor) qui l'annonce ; au clavier, le
         focus recentre déjà la grille sur chaque bulle. Masqué pendant la
         saisie (geste compris), il revient au relâchement. -->
    <Transition name="pan-hint">
      <p
        v-if="panAxis && !isPanning && !isTouching"
        class="bubble-pan__hint"
        :class="`is-${panAxis}`"
        aria-hidden="true"
      >
        <!-- Main (icône "hand" de Lucide, ISC) qui tire dans le sens du
             défilement possible : un geste de saisie, pas une molette. -->
        <svg class="bubble-pan__hint-icon" viewBox="0 0 24 24">
          <path d="M18 11V6a2 2 0 0 0-4 0" />
          <path d="M14 10V4a2 2 0 0 0-4 0v2" />
          <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
          <path
            d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"
          />
        </svg>
        Glisser pour explorer
      </p>
    </Transition>
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

type Tier = Required<Pick<BubbleUiProps, "size" | "minSize" | "gutter">>;

// Choisi d'après la plus petite dimension du conteneur. `size` est une
// taille cible : la taille réelle est ajustée pour que les colonnes
// remplissent exactement la largeur.
const TIERS: { maxSide: number; options: Tier }[] = [
  { maxSide: 480, options: { size: 110, minSize: 24, gutter: 10 } },
  { maxSide: 760, options: { size: 150, minSize: 28, gutter: 14 } },
  { maxSide: Infinity, options: { size: 190, minSize: 32, gutter: 18 } },
];

// Arrondi des tailles et rayons, pour ne pas remonter BubbleUi à chaque
// pixel de resize.
const STEP = 4;
const snap = (value: number) => Math.floor(value / STEP) * STEP;

const rootEl = ref<HTMLElement | null>(null);
const containerSize = ref<{ width: number; height: number } | null>(null);

// Même découpage que BubbleUi : rangées alternées de numCols - 1 et numCols.
function countRows(count: number, numCols: number) {
  let rows = 0;
  for (let left = count, short = true; left > 0; short = !short, rows++) {
    left -= Math.max(1, short ? numCols - 1 : numCols);
  }
  return rows;
}

function computeOptions(
  width: number,
  height: number,
  count: number,
): BubbleUiProps {
  const { minSize, gutter, ...target } = TIERS.find(
    (t) => Math.min(width, height) <= t.maxSide,
  )!.options;

  // Autant de colonnes que la largeur en accueille à la taille cible, puis
  // taille ajustée pour que les rangées longues collent aux deux bords.
  // Les bulles en trop débordent en hauteur (pan vertical) ; s'il y en a
  // peu, la grille est simplement plus petite que le conteneur.
  const cols = Math.max(2, Math.round(width / (target.size + gutter)));
  const size = snap(width / cols - gutter);
  const numCols = Math.min(cols, count);
  const pitch = size + gutter;

  // Marge que BubbleUi ajoute à son contenu scrollable pour l'arrondi des
  // coins (cornerRadius = size / 2).
  const cornerInset = ((size / 2) * (1.414 - 1)) / 1.414;

  // Pleine taille tant que la bulle tient entière dans le conteneur : elle
  // ne rétrécit qu'une fois contre le bord. Si la grille tient sur cet axe,
  // le rayon l'englobe, marge d'arrondi comprise : le contenu scrollable
  // fait alors pile la taille du conteneur, sans pan inutile ni bulles
  // réduites.
  const radius = (half: number, gridHalf: number) => {
    const edge = half - size / 2;
    return Math.max(0, gridHalf <= edge ? gridHalf + cornerInset : snap(edge));
  };
  const xRadius = radius(width / 2, (numCols * pitch - size) / 2);
  const yRadius = radius(
    height / 2,
    ((countRows(count, numCols) - 1) * 0.866 * pitch) / 2,
  );

  return {
    size,
    minSize,
    gutter,
    numCols,
    xRadius,
    yRadius,
    cornerRadius: Math.min(size / 2, xRadius, yRadius),
    // Frange courte : sur la frange, BubbleUi rapproche chaque bulle du
    // centre de (size - minSize) / 2, presque autant que la frange elle-même.
    // Les bulles qui passent le bord se tassent donc contre leurs voisines,
    // à l'intérieur du conteneur.
    fringeWidth: size / 2,
    // Au-delà de la frange, rapprochement de gravitation/10 px par px de
    // distance, réglé sur le rétrécissement (1 - minSize/size) : les bulles
    // réduites gardent un espacement à leur échelle.
    gravitation: 10 * (1 - minSize / size),
    compact: true,
  };
}

// BubbleUi copie ses options une seule fois au setup (elles ne sont pas
// réactives) : pour en changer, il faut le remonter via `key`.
const options = computed(() =>
  containerSize.value
    ? computeOptions(
        containerSize.value.width,
        containerSize.value.height,
        props.items.length,
      )
    : null,
);

const bubbleKey = computed(() => {
  const o = options.value;
  return o
    ? `${o.size}-${o.numCols}-${o.xRadius}-${o.yRadius}|${props.contentKey ?? ""}`
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
    scroller?.removeEventListener("scroll", updateOverflow);
    scroller = rootEl.value?.querySelector<HTMLElement>(".scrollable") ?? null;
    if (scroller) {
      // Pas de scroll-chaining vers la page quand on atteint un bord.
      scroller.style.overscrollBehavior = "contain";
      scroller.addEventListener("scroll", updateOverflow, { passive: true });
    }
    updateOverflow();
  },
  { flush: "post" },
);

// ── Indices de défilement ───────────────────────────────────────────

// Côtés où il reste du contenu à découvrir : un fondu y signale la suite.
const overflow = ref({ top: false, bottom: false, left: false, right: false });

const panAxis = computed(() => {
  const { top, bottom, left, right } = overflow.value;
  const x = left || right;
  const y = top || bottom;
  return x && y ? "xy" : x ? "x" : y ? "y" : null;
});

// Tolérance pour les arrondis sub-pixel de scrollLeft / scrollTop.
const EDGE_EPSILON = 2;

function updateOverflow() {
  if (!scroller) {
    overflow.value = { top: false, bottom: false, left: false, right: false };
    return;
  }
  const { scrollLeft, scrollTop, scrollWidth, scrollHeight } = scroller;
  const { clientWidth, clientHeight } = scroller;
  const next = {
    top: scrollTop > EDGE_EPSILON,
    bottom: scrollTop < scrollHeight - clientHeight - EDGE_EPSILON,
    left: scrollLeft > EDGE_EPSILON,
    right: scrollLeft < scrollWidth - clientWidth - EDGE_EPSILON,
  };
  const current = overflow.value;
  // Pas de nouvel objet à chaque événement scroll si rien ne change.
  if ((Object.keys(next) as (keyof typeof next)[]).some((k) => next[k] !== current[k])) {
    overflow.value = next;
  }
}

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (!rootEl.value) return;
  resizeObserver = new ResizeObserver(([entry]) => {
    if (!entry) return;
    const { width, height } = entry.contentRect;
    if (width > 0 && height > 0) containerSize.value = { width, height };
    // Sans remontage (bubbleKey inchangée), la plage de scroll a pu changer.
    updateOverflow();
  });
  resizeObserver.observe(rootEl.value);
});

// ── Pan ─────────────────────────────────────────────────────────────

const isPanning = ref(false);

// Au doigt, le scroll natif gère le pan (pas d'isPanning) : doigt posé
// sur la zone.
const isTouching = ref(false);

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
  scroller?.removeEventListener("scroll", updateOverflow);
  scroller = null;
});
</script>

<style lang="scss" scoped>
// Enregistrées pour que les fondus s'animent (une variable CSS brute ne se
// transitionne pas).
@property --fade-top {
  syntax: "<length-percentage>";
  inherits: false;
  initial-value: 0px;
}
@property --fade-bottom {
  syntax: "<length-percentage>";
  inherits: false;
  initial-value: 0px;
}
@property --fade-left {
  syntax: "<length-percentage>";
  inherits: false;
  initial-value: 0px;
}
@property --fade-right {
  syntax: "<length-percentage>";
  inherits: false;
  initial-value: 0px;
}

.bubble-pan {
  // Large (de l'ordre d'une demi-bulle et plus) : le fondu atteint les
  // bulles pleine taille, pas seulement les petites tassées contre le bord.
  --fade-size: clamp(64px, 20%, 180px);

  position: relative;
  width: 45%;
  height: 100%;
  overflow: hidden;

  &.can-pan {
    cursor: grab;
  }

  &.is-panning {
    cursor: grabbing;
    user-select: none;
  }
}

.bubble-pan__viewport {
  position: absolute;
  inset: 0;

  // Fondu sur chaque côté où il reste du contenu : les bulles s'y estompent,
  // ce qui suggère une suite. Les deux masques (vertical, horizontal) se
  // combinent par intersection.
  mask-image:
    linear-gradient(
      to bottom,
      transparent,
      #000 var(--fade-top),
      #000 calc(100% - var(--fade-bottom)),
      transparent
    ),
    linear-gradient(
      to right,
      transparent,
      #000 var(--fade-left),
      #000 calc(100% - var(--fade-right)),
      transparent
    );
  mask-composite: intersect;
  transition:
    --fade-top 0.3s ease,
    --fade-bottom 0.3s ease,
    --fade-left 0.3s ease,
    --fade-right 0.3s ease;

  &.fade-top {
    --fade-top: var(--fade-size);
  }
  &.fade-bottom {
    --fade-bottom: var(--fade-size);
  }
  &.fade-left {
    --fade-left: var(--fade-size);
  }
  &.fade-right {
    --fade-right: var(--fade-size);
  }
}

.bubble-pan__hint {
  position: absolute;
  left: 50%;
  bottom: 1rem;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin: 0;
  padding: 0.5rem 0.9rem;
  border-radius: 999px;
  background: rgba(20, 20, 18, 0.7);
  backdrop-filter: blur(10px);
  color: #fff8f2;
  font-size: 0.8rem;
  width: max-content;
  max-width: calc(100% - 1rem);
  text-align: center;
  pointer-events: none;
  transform: translateX(-50%);
}

.bubble-pan__hint-icon {
  flex: none;
  width: 1.2em;
  height: 1.2em;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;

  // La main se referme (saisie), tire dans le sens du défilement possible,
  // se rouvre et revient : un geste de drag, pas de molette.
  --pull-x: 0px;
  --pull-y: 0px;
  animation: pan-hint-grab 1.8s ease-in-out infinite;

  .is-x & {
    --pull-x: 5px;
  }
  .is-y & {
    --pull-y: 5px;
  }
  .is-xy & {
    --pull-x: 4px;
    --pull-y: 4px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
}

@keyframes pan-hint-grab {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  20% {
    transform: translate(0, 0) scale(0.82);
  }
  55% {
    transform: translate(var(--pull-x), var(--pull-y)) scale(0.82);
  }
  75% {
    transform: translate(var(--pull-x), var(--pull-y)) scale(1);
  }
}

// Critère inverse de celui du curseur custom : la pastille n'existe
// qu'au doigt.
@media (hover: hover) and (pointer: fine) {
  .bubble-pan__hint {
    display: none;
  }
}

.pan-hint-enter-active,
.pan-hint-leave-active {
  transition:
    opacity 0.3s ease,
    translate 0.3s ease;
}
.pan-hint-enter-from,
.pan-hint-leave-to {
  opacity: 0;
  translate: 0 6px;
}
</style>
