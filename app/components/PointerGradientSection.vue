<template>
  <section
    ref="sectionRef"
    class="pointer-gradient-section"
    :style="sectionStyle"
  >
    <slot />
  </section>
</template>

<script lang="ts">
// Bloc "normal" (pas setup) : exécuté une seule fois au chargement du module,
// partagé par TOUTES les instances du composant sur la page — contrairement
// à <script setup> qui re-run à chaque instance. Ça permet à une section qui
// apparaît après coup (lazy mount, v-if, scroll...) de connaître tout de suite
// la dernière position connue du pointeur, sans attendre un mouvement sur elle.
let lastPointerX = 0;
let lastPointerY = 0;
let hasPointerMoved = false;
let globalListenerAttached = false;

function ensureGlobalPointerListener() {
  if (globalListenerAttached || typeof window === "undefined") return;
  globalListenerAttached = true;
  window.addEventListener(
    "pointermove",
    (event: PointerEvent) => {
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      hasPointerMoved = true;
    },
    { passive: true },
  );
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

interface Props {
  /** Couleur de fond unie (paramètre 1) */
  backgroundColor?: string;
  /** Couleur du radial gradient, part de cette couleur vers transparent (paramètre 2) */
  gradientColor?: string;
  /** Largeur de la section */
  width?: string;
  /** Hauteur de la section */
  height?: string;
  /** Rayon du gradient (n'importe quelle unité CSS : px, vw, %...) */
  gradientSize?: string;
  /** Étape à partir de laquelle le gradient devient transparent (0-100%) */
  fadeStop?: string;
  /** Opacité du gradient, entre 0 et 1 */
  opacity?: number;
}

const props = withDefaults(defineProps<Props>(), {
  backgroundColor: "#0d0d0d",
  gradientColor: "#6c5ce7",
  width: "100%",
  height: "100px",
  gradientSize: "600px",
  fadeStop: "70%",
  opacity: 0.65,
});

const sectionRef = ref<HTMLElement | null>(null);
let rafId: number | null = null;

const sectionStyle = computed(() => ({
  width: props.width,
  height: props.height,
  backgroundColor: props.backgroundColor,
  "--gradient-color": props.gradientColor,
  "--gradient-size": props.gradientSize,
  "--fade-stop": props.fadeStop,
  "--gradient-opacity": props.opacity,
}));

// Écrit --x/--y à partir de la dernière position connue du pointeur, relative
// au rect de LA SECTION (recalculé à chaque frame, donc valide même si la
// page a scrollé entre deux mouvements). Pas de clamp : si le pointeur est
// hors de la section, --x/--y sortent de [0, largeur/hauteur] — le
// radial-gradient suit quand même, seule la partie dans la section
// (overflow: hidden) reste visible.
function applyPointerPosition() {
  rafId = null;
  const el = sectionRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  el.style.setProperty("--x", `${lastPointerX - rect.left}px`);
  el.style.setProperty("--y", `${lastPointerY - rect.top}px`);
}

function scheduleUpdate() {
  if (rafId === null) {
    rafId = requestAnimationFrame(applyPointerPosition);
  }
}

// Écoute sur window, pas sur la section : indispensable pour continuer à
// suivre le pointeur quand il est en dehors des bords de la section.
function handleWindowPointerMove() {
  scheduleUpdate();
}

onMounted(() => {
  ensureGlobalPointerListener();
  window.addEventListener("pointermove", handleWindowPointerMove, {
    passive: true,
  });

  // Si le pointeur a déjà bougé ailleurs sur la page avant que cette instance
  // n'apparaisse, on se cale dessus dès le premier frame au lieu d'attendre
  // un nouveau mouvement.
  if (hasPointerMoved) {
    scheduleUpdate();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("pointermove", handleWindowPointerMove);
  if (rafId !== null) cancelAnimationFrame(rafId);
});
</script>

<style scoped>
.pointer-gradient-section {
  position: relative;
  overflow: hidden;
  --x: 50%;
  --y: 50%;
}

.pointer-gradient-section::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: var(--gradient-opacity);
  transition: opacity 0.3s ease;
  background: radial-gradient(
    circle var(--gradient-size) at var(--x) var(--y),
    var(--gradient-color),
    transparent var(--fade-stop)
  );
}
</style>
