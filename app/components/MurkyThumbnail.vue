<script lang="ts">
let murkyThumbnailSeed = 0;
</script>

<template>
  <figure
    ref="rootEl"
    class="murky-thumb"
    :class="{ 'murky-thumb--active': isVisible }"
  >
    <svg class="murky-thumb__defs" aria-hidden="true" focusable="false">
      <filter
        :id="filterId"
        x="-25%"
        y="-25%"
        width="150%"
        height="150%"
        color-interpolation-filters="sRGB"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.010 0.022"
          numOctaves="3"
          :seed="seed"
          result="noise"
        >
          <animate
            v-if="!reducedMotion && isVisible"
            attributeName="baseFrequency"
            values="0.010 0.022; 0.014 0.017; 0.010 0.022"
            dur="11s"
            repeatCount="indefinite"
          />
        </feTurbulence>
        <feDisplacementMap
          ref="displacementR"
          in="SourceGraphic"
          in2="noise"
          scale="38"
          xChannelSelector="R"
          yChannelSelector="G"
          result="dR"
        />
        <feColorMatrix
          in="dR"
          type="matrix"
          values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
          result="onlyR"
        />
        <feDisplacementMap
          ref="displacementG"
          in="SourceGraphic"
          in2="noise"
          scale="26"
          xChannelSelector="R"
          yChannelSelector="G"
          result="dG"
        />
        <feColorMatrix
          in="dG"
          type="matrix"
          values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
          result="onlyG"
        />
        <feDisplacementMap
          ref="displacementB"
          in="SourceGraphic"
          in2="noise"
          scale="15"
          xChannelSelector="R"
          yChannelSelector="G"
          result="dB"
        />
        <feColorMatrix
          in="dB"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
          result="onlyB"
        />
        <feBlend in="onlyR" in2="onlyG" mode="screen" result="rg" />
        <feBlend in="rg" in2="onlyB" mode="screen" />
      </filter>
    </svg>

    <NuxtImg
      class="murky-thumb__image"
      :style="frameStyle"
      :src="src"
      :alt="alt"
      width="280"
      height="150"
      quality="68"
      loading="lazy"
      format="webp"
      sizes="(max-width: 700px) 100vw, (max-width: 1200px) 50vw, 500px"
    />
  </figure>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useMurkyEffect } from "~/composables/useMurkyEffect";
import { useInViewport } from "~/composables/useInViewport";

const props = defineProps<{
  src: string;
  alt: string;
}>();

const rootEl = ref<HTMLElement | null>(null);
const displacementR = ref<SVGFEDisplacementMapElement | null>(null);
const displacementG = ref<SVGFEDisplacementMapElement | null>(null);
const displacementB = ref<SVGFEDisplacementMapElement | null>(null);

const seed = ++murkyThumbnailSeed;
const filterId = `murky-${seed}`;

const { isVisible } = useInViewport(rootEl);

const { reducedMotion } = useMurkyEffect(
  rootEl,
  { r: displacementR, g: displacementG, b: displacementB },
  isVisible,
);

const frameStyle = computed(() => ({
  // Hors viewport : pas de filtre du tout, pas juste pas d'animation.
  // Sans ça, chaque carte montée fait tourner le chaînage complet
  // (turbulence + 3 displacement + 3 colorMatrix + 2 blend) dès que son
  // image charge, qu'elle soit visible ou non — c'est ça qui pique au
  // montage d'une grille non virtualisée.
  filter: isVisible.value ? `url(#${filterId})` : "none",
}));
</script>

<style lang="scss" scoped>
.murky-thumb {
  position: relative;
  margin: 0;
  overflow: hidden;
  width: fit-content;
  min-height: 80px;
}

.murky-thumb--active {
  // Le filtre est coûteux à rasteriser ; sans isolation, le transform
  // GSAP du scroll horizontal peut forcer une re-rasterisation à chaque
  // frame de scroll même quand scale() ne change plus. Conditionné à
  // isVisible : pas la peine de réserver une couche GPU pour une carte
  // qui n'a de toute façon plus de filtre appliqué (frameStyle ci-dessus).
  will-change: filter;
}

.murky-thumb__defs {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}

.murky-thumb__frame {
  position: relative;
  inset: 0;
  aspect-ratio: 4 / 3;
  overflow: hidden;
}
</style>
