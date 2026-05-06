<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { initResponsiveHorizontalScroll } from "./utils/responsiveHorizontalScroll";

const scrollWrapper = ref(null);
let dispose: (() => void) | null = null;

onMounted(() => {
  if (!scrollWrapper.value) return;
  dispose = initResponsiveHorizontalScroll(scrollWrapper.value, {
    breakpointRatio: 1,
    portraitClass: "is-portrait",
    mapOptions: {
      duration: 0.8,
      speedMultiplier: 1,
    },
  });
});

onBeforeUnmount(() => {
  dispose?.();
});
</script>

<template>
  <div ref="scrollWrapper" class="horizontal-scroll-wrapper">
    <div>item 1</div>
    <div>item 2</div>
    <div>item 3</div>
    <div>item 4</div>
    <div>item 5</div>
  </div>
</template>

<style lang="scss">
.horizontal-scroll-wrapper {
  height: 100%;
  display: flex;
  overflow-x: scroll;

  > div {
    color: white;
    height: 100%;
    flex: 0 0 auto;
    min-width: 100vw;

    &:nth-child(1) {
      background-color: #474aff;
      width: 2000px;
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
}

.horizontal-scroll-wrapper.is-portrait > div {
  width: 100%;
  box-sizing: border-box;
  min-height: 60vh;
  flex: none;
}
</style>
