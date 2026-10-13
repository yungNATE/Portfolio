<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import initResponsiveHorizontalScroll, {
  type ResponsiveHorizontalScrollHandle,
} from "../utils/responsiveHorizontalScroll";

const scrollWrapper = ref<HTMLElement | null>(null);
let scrollHandle: ResponsiveHorizontalScrollHandle | null = null;

function syncSectionColors() {
  const sections =
    scrollWrapper.value?.querySelectorAll<HTMLElement>("section[data-color]") ??
    [];

  sections.forEach((section) => {
    const color = section.dataset.color;

    if (color) {
      section.style.setProperty("--section-color", color);
    }
  });
}

onMounted(() => {
  syncSectionColors();

  // Initialiser le scroll horizontal (si l'élément est disponible)
  if (scrollWrapper.value) {
    scrollHandle = initResponsiveHorizontalScroll(scrollWrapper.value, {
      breakpointRatio: 1,
      portraitClass: "is-portrait",
      mapOptions: {
        duration: 0.8,
        speedMultiplier: 1,
      },
    });
  }

  // Retour depuis une étude de cas (/#work) : le wrapper défile seul, le
  // scroll natif vers l'ancre ne l'atteint pas.
  const hash = window.location.hash;
  if (hash) {
    scrollWrapper.value
      ?.querySelector<HTMLElement>(hash)
      ?.scrollIntoView({ block: "start", inline: "start" });
  }
});

onBeforeUnmount(() => {
  scrollHandle?.dispose();
  scrollHandle = null;
});
</script>

<template>
  <MagneticCursor />

  <div ref="scrollWrapper" class="horizontal-scroll-wrapper">
    <section id="intro" data-color="#474aff" data-label="Accueil">
      <ReliefBackground />
      <Intro />
      <PointerGradientSection
        background-color="#ff9f0a"
        gradient-color="#474aff"
      >
        <ScrollIndicator />
      </PointerGradientSection>
    </section>

    <section id="parcours" data-color="#0b6e4f" data-label="Parcours">
      <ReliefBackground />
      <Parcours />
      <PointerGradientSection
        background-color="#c9a8ff"
        gradient-color="#0b6e4f"
      >
        <ScrollIndicator />
      </PointerGradientSection>
    </section>

    <section id="work" data-color="#ff0073" data-label="Projets">
      <ReliefBackground />
      <Projects />
      <PointerGradientSection
        background-color="#61FFB8"
        gradient-color="#ff0073"
      >
        <ScrollIndicator />
      </PointerGradientSection>
    </section>

    <section id="contact" data-color="#f2e8e5" data-label="Contact">
      <ReliefBackground />
      <Contact />
      <PointerGradientSection
        background-color="#28738A"
        gradient-color="#f2e8e5"
      >
        <ScrollIndicator />
      </PointerGradientSection>
    </section>
  </div>
</template>

<style lang="scss">
.horizontal-scroll-wrapper {
  height: 100%;
  display: flex;
  overflow-x: scroll;

  &:not(.is-portrait) {
    > section {
      min-width: 100vw;
      width: fit-content;
      height: 100%;
    }
  }

  &.is-portrait {
    > section {
      min-height: 100vh;
      width: 100%;
    }
  }

  > section {
    isolation: isolate;
    position: relative;

    color: white;
    flex: 0 0 auto;

    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-direction: column;

    background-color: var(--section-color);

    &:last-child {
      color: black;
      width: 100vw;
    }

    > div {
      height: 100%;
      width: 100%;
      padding: 20px;
    }
  }
}

/* Portrait / small-aspect handling: disable horizontal mapping and stack items */
.horizontal-scroll-wrapper.is-portrait {
  display: block;

  // Bande à effet de survol : sans pointeur sur mobile, elle ne sert à rien
  .pointer-gradient-section {
    display: none;
  }
}
</style>
