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
    height: 100%;
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

  .intro {
    display: flex;
    align-items: center;
    justify-content: left;
    padding: 20px;

    .titles {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 10px;
      height: 48px;
      transition: transform 0.4s ease;
      // background: var(--background-color);

      h1,
      .h1 {
        font-size: 3rem;
        font-weight: bold;
        margin: 0;
        line-height: 1;
        transition:
          color 0.4s ease,
          transform 0.4s ease;

        color: rgba(white, 0.2);

        &.active {
          color: white;
        }
      }
    }
  }
}

/* Base styles for ASCII art (applies in all orientations) */
.ascii-art {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;

  opacity: 0.3;

  font-family: "Courier New", monospace;
  font-size: 8px;
  line-height: 1;
  letter-spacing: 0;
  white-space: pre;
  overflow: auto;
  color: inherit;
  margin-top: 5px;
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
