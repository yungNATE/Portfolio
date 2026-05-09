<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import PlayASCIIFrames from "../utils/PlayASCIIFrames_fixed";
import type { PlayASCIIFramesInstance } from "../utils/PlayASCIIFrames_fixed";
import { frames } from "../assets/js/ASCIISelfieFrames.js";

const asciiArt = ref<HTMLElement | null>(null);
const titles = ref<HTMLElement | null>(null);
let asciiPlayer: PlayASCIIFramesInstance | null = null;
let titleNodes: HTMLElement[] = [];
let activeIndex = 0;
let titlesInterval: number | null = null;

onMounted(async () => {
  await nextTick();

  if (asciiArt.value && frames && frames.length > 0) {
    asciiPlayer = PlayASCIIFrames(frames, {
      fps: 16,
      element: asciiArt.value,
    });
    asciiPlayer.play();
  }

  if (titles.value) {
    titleNodes = Array.from(titles.value.children) as HTMLElement[];

    if (titleNodes.length > 0) {
      activeIndex = 0;
      const delay = 2000; // ms
      titlesInterval = window.setInterval(() => {
        const prev = activeIndex;
        activeIndex = (activeIndex + 1) % titleNodes.length;
        titleNodes[prev].classList.remove("active");
        titleNodes[activeIndex].classList.add("active");
        centerActiveTitle(titleNodes, activeIndex);
      }, delay);
    }
  }

  function centerActiveTitle(nodes: HTMLElement[], index: number) {
    let size = 48; // px
    const offset = size * index - size;
    if (titles.value) {
      titles.value.style.transform = `translateY(${-offset}px)`;
    }
  }
});

onBeforeUnmount(() => {
  asciiPlayer?.dispose();
  if (titlesInterval) {
    clearInterval(titlesInterval);
    titlesInterval = null;
  }
});
</script>

<template>
  <div class="education">
    <ul>
      <li>DUT Informatique</li>
      <li>Licence Professionnelle Métiers du Numérique</li>
      <li>Master HIC parcours UX Design</li>
    </ul>
  </div>
  <div class="titles" ref="titles">
    <h1 class="active">Nathan Martinigol</h1>
    <p class="h1">Informaticien</p>
    <p class="h1">Développeur Frontend</p>
    <p class="h1">UX Designer</p>
  </div>

  <pre ref="asciiArt" class="ascii-art"></pre>
</template>

<style lang="scss">
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
</style>
