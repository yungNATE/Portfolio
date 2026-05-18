<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import initResponsiveHorizontalScroll from "./utils/responsiveHorizontalScroll";
import Intro from "./components/Intro.vue";

const scrollWrapper = ref<HTMLElement | null>(null);
let disposeScroll: (() => void) | null = null;

onMounted(() => {
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
    <section class="intro">
      <Intro />
    </section>
    <section>item 2</section>
    <section>item 3</section>
    <section>item 4</section>
    <section>item 5</section>
  </div>
</template>

<style lang="scss">
.horizontal-scroll-wrapper {
  height: 100%;
  display: flex;
  overflow-x: scroll;

  > section {
    isolation: isolate;

    color: white;
    flex: 0 0 auto;
    min-width: 100vw;

    &:nth-child(1) {
      background-color: #474aff;
      min-width: 100vw;
    }
    &:nth-child(2) {
      background-color: #ff0073;
      width: 2500px;
    }
    &:nth-child(3) {
      background-color: #ff3737;
      width: 2500px;
    }
    &:nth-child(4) {
      background-color: #ff7700;
      width: 2500px;
    }
    &:nth-child(5) {
      background-color: #f2e8e5;
      color: black;
      width: 100vw;
    }
  }
}

/* Portrait / small-aspect handling: disable horizontal mapping and stack items */
.horizontal-scroll-wrapper.is-portrait {
  display: block;
  overflow-x: hidden;
  overflow-y: auto;

  .ascii-art {
    overflow: hidden;
  }
}

.horizontal-scroll-wrapper.is-portrait > div {
  width: 100%;
  box-sizing: border-box;
  min-height: 60vh;
  flex: none;
}
</style>
