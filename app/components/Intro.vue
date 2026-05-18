<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from "vue";
import PlayASCIIFrames from "../utils/PlayASCIIFrames_fixed";
import type { PlayASCIIFramesInstance } from "../utils/PlayASCIIFrames_fixed";
import { frames } from "../assets/js/ASCIISelfieFrames2.js";
import { useScreenInfo } from "../utils/screen";

const asciiArt = ref<HTMLElement | null>(null);
const titles = ref<HTMLElement | null>(null);
const { screenMode } = useScreenInfo();
let asciiPlayer: PlayASCIIFramesInstance | null = null;
let titleNodes: HTMLElement[] = [];
let activeIndex = 0;
let titlesInterval: number | null = null;

function stopTitleAnimation() {
  if (titlesInterval) {
    clearInterval(titlesInterval);
    titlesInterval = null;
  }

  if (titles.value) {
    titles.value.style.transform = "";
  }

  titleNodes.forEach((node, index) => {
    node.classList.toggle("active", index === 0);
  });

  activeIndex = 0;
}

function startTitleAnimation() {
  stopTitleAnimation(); // Clean reset before starting
  let isHorizontal = screenMode.value === "horizontal";

  if (!titles.value) {
    return;
  }

  titleNodes = Array.from(titles.value.children) as HTMLElement[];

  if (titleNodes.length === 0) {
    return;
  }

  activeIndex = 0;
  const delay = 2000; // ms
  titlesInterval = window.setInterval(() => {
    const prev = activeIndex;
    activeIndex = (activeIndex + 1) % titleNodes.length;
    titleNodes[prev]?.classList.remove("active");
    titleNodes[activeIndex]?.classList.add("active");
    isHorizontal ? centerActiveTitle(titleNodes, activeIndex) : null;
  }, delay);
}

function centerActiveTitle(nodes: HTMLElement[], index: number) {
  let size = 48; // px
  const offset = size * index - size;
  if (titles.value) {
    titles.value.style.transform = `translateY(${-offset}px)`;
  }
}

onMounted(async () => {
  await nextTick();

  // Initialize ASCII player
  if (asciiArt.value && frames && frames.length > 0) {
    asciiPlayer = PlayASCIIFrames(frames, {
      fps: 24,
      element: asciiArt.value,
    });
    asciiPlayer.play();
  }

  // Setup title animation (enabled only in horizontal mode)
  startTitleAnimation();
});

watch(screenMode, () => {
  startTitleAnimation();
});

onBeforeUnmount(() => {
  asciiPlayer?.dispose();
  stopTitleAnimation();
});
</script>

<template>
  <div
    class="introWrapper"
    :class="{ 'is-portrait': screenMode === 'vertical' }"
  >
    <ul
      class="titles"
      ref="titles"
      aria-label="Présentation de Nathan Martinigol"
    >
      <li class="active">
        <h1>Nathan Martinigol</h1>
      </li>
      <li class="h1"><p>Informaticien</p></li>
      <li class="h1"><p>Développeur Frontend</p></li>
      <li class="h1"><p>& créatif</p></li>
      <li class="h1"><p>UX Designer</p></li>
      <li class="h1"><p>Motion Enthusiast</p></li>
      <li class="h1"><p>Light Enthusiast</p></li>
    </ul>

    <SkillGraph />

    <nav class="main-menu">
      <ul>
        <li class="CV">
          <a
            href="/Frontend_CV_MartinigolNathan.pdf"
            target="_blank"
            rel="noopener noreferrer"
            class="external"
            >CV</a
          >
        </li>
        <li class="contact">
          <a
            href="https://www.linkedin.com/in/martinigol/"
            target="_blank"
            rel="noopener noreferrer"
            class="external"
            >Linkedin</a
          >
        </li>
        <li class="contact">
          <a href="#contact" class="anchor">Discutons</a>
        </li>
      </ul>
    </nav>
    <pre ref="asciiArt" class="ascii-art"></pre>
  </div>
</template>

<style lang="scss">
.introWrapper {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-direction: row;
  min-height: 100%;
  overflow: hidden;
  gap: 50px;

  &.is-portrait {
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 50px 20px;

    .titles,
    .main-menu {
      width: 100%;
      z-index: 1;
    }

    .ascii-art {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      height: 100%;
      padding: 20px;
      justify-content: center;
      align-items: flex-start;
      font-size: clamp(0.28rem, 1.7vw, 0.8vh);
    }
  }

  .titles {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 10px;
    list-style: none;
    padding: 0;
    margin: 0;
    transition: transform 0.4s ease;

    .animated {
      height: 48px;
    }

    li {
      font-size: clamp(1rem, 7vw, 3rem);
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

      h1 {
        font-size: inherit;
        font-weight: inherit;
        margin: 0;
        line-height: inherit;
      }
    }
  }

  .main-menu {
    position: relative;
    align-self: start;
    z-index: 1;

    > ul {
      display: flex;
      gap: 30px;
      list-style: none;
      justify-content: center;
      padding: 0;
    }

    li {
      position: relative;
    }
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Base styles for ASCII art (applies in all orientations) */
.ascii-art {
  position: fixed;
  inset: 0 auto 0 0;
  width: 100vw;
  height: 100dvh;
  z-index: 0;
  pointer-events: none;

  opacity: 0.3;

  font-family: "Courier New", monospace;
  font-size: clamp(0.34rem, 0.72vw, 1.05vh);
  line-height: 0.95;
  letter-spacing: 0;
  white-space: pre;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 20px;
  color: inherit;
}

@media (max-width: 768px), (max-aspect-ratio: 1/1) {
  .ascii-art {
    width: 100%;
    height: 100%;
    font-size: clamp(0.28rem, 1.7vw, 0.8vh);
    line-height: 0.9;
  }
}
</style>
