<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import initResponsiveHorizontalScroll from "./utils/responsiveHorizontalScroll";
import Intro from "./components/Intro.vue";

const scrollWrapper = ref<HTMLElement | null>(null);
let disposeScroll: (() => void) | null = null;

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
    disposeScroll = initResponsiveHorizontalScroll(scrollWrapper.value, {
      breakpointRatio: 1,
      portraitClass: "is-portrait",
      mapOptions: {
        duration: 0.8,
        speedMultiplier: 1,
      },
    });
  }
});

onBeforeUnmount(() => {
  disposeScroll?.();
});
</script>

<template>
  <div ref="scrollWrapper" class="horizontal-scroll-wrapper">
    <section id="intro" data-color="#474aff">
      <Intro />
    </section>

    <section id="work" data-color="#ff0073">
      <Wip />
    </section>

    <section id="contact" data-color="#f2e8e5">
      <Contact />
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

    color: white;
    flex: 0 0 auto;
    padding: 20px;

    display: flex;
    align-items: center;
    justify-content: center;

    background-color: var(--section-color);

    &:last-child {
      color: black;
      width: 100vw;
    }

    > div {
      height: 100%;
      width: 100%;
    }
  }
}

/* Portrait / small-aspect handling: disable horizontal mapping and stack items */
.horizontal-scroll-wrapper.is-portrait {
  display: block;
}
</style>
