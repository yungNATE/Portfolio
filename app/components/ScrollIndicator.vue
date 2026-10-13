<script setup lang="ts">
import gsap from "gsap";
import { onBeforeUnmount, onMounted, ref } from "vue";

/**
 * Indicateur de défilement horizontal, à placer dans la bande
 * (PointerGradientSection) d'une <section data-label> : section courante +
 * progression à gauche, section suivante à droite. Les deux plaques sont
 * collées aux bords de l'écran (sticky) tant que la bande défile.
 *
 * Lisibilité : le dégradé qui suit la souris fait varier le fond de la bande
 * du clair au foncé, aucune couleur de texte ne tient partout. Les plaques ont
 * donc le fond uni de la bande (le dégradé passe derrière, pas sous le texte)
 * et une encre choisie pour contraster avec ce fond.
 */

type RGB = [number, number, number];

const rootEl = ref<HTMLElement | null>(null);
const ready = ref(false);
const index = ref(0);
const total = ref(0);
const label = ref("");
const nextLabel = ref<string | null>(null);
const progress = ref(0);
const tone = ref<Record<string, string>>({});

let wrapper: HTMLElement | null = null;
let nextSection: HTMLElement | null = null;

// ── Contraste (WCAG) ────────────────────────────────────────────────

function parseColor(value: string): RGB | null {
  const hex = value.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (hex) {
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
  }
  const rgb = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null;
}

function luminance([r, g, b]: RGB) {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: RGB, b: RGB) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

const toCss = ([r, g, b]: RGB) => `rgb(${r}, ${g}, ${b})`;

// Encre : la couleur de la section assombrie (garde la teinte) ou du blanc,
// celle qui contraste le plus avec la bande.
function readTone(section: HTMLElement, band: HTMLElement | null) {
  const bandColor = parseColor(
    band ? getComputedStyle(band).backgroundColor : "",
  ) ?? [0, 0, 0];
  const sectionColor = parseColor(section.dataset.color ?? "") ?? [0, 0, 0];

  const tinted = sectionColor.map((c) => Math.round(c * 0.35)) as RGB;
  const white: RGB = [255, 255, 255];
  const ink =
    contrast(tinted, bandColor) >= contrast(white, bandColor) ? tinted : white;

  return { "--band": toCss(bandColor), "--ink": toCss(ink) };
}

// ── Suivi du scroll ─────────────────────────────────────────────────

function updateProgress() {
  if (!wrapper) return;
  const maxScroll = wrapper.scrollWidth - wrapper.clientWidth;
  progress.value = maxScroll > 0 ? wrapper.scrollLeft / maxScroll : 0;
}

function goToNext() {
  if (!wrapper || !nextSection) return;
  gsap.to(wrapper, {
    scrollLeft: nextSection.offsetLeft,
    duration: 0.8,
    ease: "power2.out",
  });
}

onMounted(() => {
  const section = rootEl.value?.closest<HTMLElement>("section[data-label]");
  wrapper =
    rootEl.value?.closest<HTMLElement>(".horizontal-scroll-wrapper") ?? null;
  if (!section || !wrapper) return;

  const sections = Array.from(
    wrapper.querySelectorAll<HTMLElement>(":scope > section[data-label]"),
  );
  index.value = sections.indexOf(section);
  total.value = sections.length;
  label.value = section.dataset.label ?? "";
  nextSection = sections[index.value + 1] ?? null;
  nextLabel.value = nextSection?.dataset.label ?? null;
  tone.value = readTone(
    section,
    rootEl.value?.closest<HTMLElement>(".pointer-gradient-section") ?? null,
  );

  wrapper.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  updateProgress();
  ready.value = true;
});

onBeforeUnmount(() => {
  wrapper?.removeEventListener("scroll", updateProgress);
  window.removeEventListener("resize", updateProgress);
});

const pad = (n: number) => String(n).padStart(2, "0");
</script>

<template>
  <div ref="rootEl" class="scroll-indicator" :style="tone">
    <template v-if="ready">
      <p class="scroll-indicator__plate scroll-indicator__current" aria-hidden="true">
        <span>{{ pad(index + 1) }}/{{ pad(total) }}</span>
        <span class="scroll-indicator__track">
          <span
            class="scroll-indicator__fill"
            :style="{ transform: `scaleX(${progress})` }"
          />
        </span>
        <span>{{ label }}</span>
      </p>

      <button
        v-if="nextLabel"
        type="button"
        class="scroll-indicator__plate scroll-indicator__next"
        @click="goToNext"
      >
        {{ nextLabel }}
        <span class="scroll-indicator__arrow" aria-hidden="true">→</span>
      </button>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.scroll-indicator {
  // Au-dessus du dégradé (::before de la bande)
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-inline: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  // Laisse passer le pointeur vers la bande (effet de survol), sauf le bouton
  pointer-events: none;
}

// Plaque : fond uni de la bande, filet à l'encre, angles droits
.scroll-indicator__plate {
  position: sticky;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  height: 28px;
  margin: 0;
  padding: 0 0.75rem;
  border: 1px solid var(--ink);
  background: var(--band);
  color: var(--ink);
}

.scroll-indicator__current {
  left: 20px;
}

.scroll-indicator__track {
  position: relative;
  width: 64px;
  height: 1px;
  background: color-mix(in srgb, currentColor 30%, transparent);
}

.scroll-indicator__fill {
  position: absolute;
  inset: 0;
  background: currentColor;
  transform-origin: left center;
}

.scroll-indicator__next {
  right: 20px;
  gap: 0.6rem;
  appearance: none;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  cursor: pointer;
  pointer-events: auto;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;

  // Inversion au survol
  &:hover,
  &:focus-visible {
    background: var(--ink);
    color: var(--band);
    outline: none;

    .scroll-indicator__arrow {
      animation: none;
      transform: translateX(3px);
    }
  }
}

.scroll-indicator__arrow {
  display: inline-block;
  font-size: 1rem;
  line-height: 1;
  transition: transform 0.2s ease;
  animation: scroll-indicator-nudge 2.4s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
}

@keyframes scroll-indicator-nudge {
  0%,
  60%,
  100% {
    transform: translateX(0);
  }
  30% {
    transform: translateX(3px);
  }
}
</style>
