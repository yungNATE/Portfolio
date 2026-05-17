<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from "vue";
import PlayASCIIFrames from "../utils/PlayASCIIFrames_fixed";
import type { PlayASCIIFramesInstance } from "../utils/PlayASCIIFrames_fixed";
import { frames } from "../assets/js/ASCIISelfieFrames.js";
import { useScreenInfo } from "../utils/screen";

const asciiArt = ref<HTMLElement | null>(null);
const titles = ref<HTMLElement | null>(null);
const isCompetencesOpen = ref(false);
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
  if (!titles.value || screenMode.value !== "horizontal") {
    stopTitleAnimation();
    return;
  }

  titleNodes = Array.from(titles.value.children) as HTMLElement[];

  if (titleNodes.length === 0) {
    stopTitleAnimation();
    return;
  }

  stopTitleAnimation();
  activeIndex = 0;
  const delay = 2000; // ms
  titlesInterval = window.setInterval(() => {
    const prev = activeIndex;
    activeIndex = (activeIndex + 1) % titleNodes.length;
    titleNodes[prev]?.classList.remove("active");
    titleNodes[activeIndex]?.classList.add("active");
    centerActiveTitle(titleNodes, activeIndex);
  }, delay);
}

function centerActiveTitle(nodes: HTMLElement[], index: number) {
  let size = 48; // px
  const offset = size * index - size;
  if (titles.value) {
    titles.value.style.transform = `translateY(${-offset}px)`;
  }
}

const technosList = ref<
  Array<{
    title: string;
    level?: string;
    description?: string;
    priority?: number;
  }>
>([]);

const { data: fetchedTechnos } = await useAsyncData("technos", () =>
  queryCollection("technos")
    .where("priority", "=", 1)
    .select("title", "level", "description", "priority")
    .all(),
);
technosList.value = (fetchedTechnos?.value || []).map((t: any) => ({
  title: t.title || "Untitled",
  level: t.level ?? "///",
  description: t.description ?? "///",
  priority: t.priority ?? 999,
}));

onMounted(async () => {
  await nextTick();

  // Initialize ASCII player
  if (asciiArt.value && frames && frames.length > 0) {
    asciiPlayer = PlayASCIIFrames(frames, {
      fps: 8,
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
    <div class="titles" ref="titles">
      <h1 class="active">Nathan Martinigol</h1>
      <p class="h1">Informaticien</p>
      <p class="h1">Développeur Frontend</p>
      <p class="h1">& créatif</p>
      <p class="h1">UX Designer</p>
      <p class="h1">Motion Enthusiast</p>
      <p class="h1">Light Enthusiast</p>
    </div>

    <nav class="main-menu">
      <ul>
        <li>
          <button
            class="competences-btn"
            :aria-expanded="isCompetencesOpen"
            aria-controls="competences-menu"
            @click="isCompetencesOpen = !isCompetencesOpen"
            @keydown.escape="isCompetencesOpen = false"
          >
            Compétences clés
          </button>
          <ul
            v-show="isCompetencesOpen"
            id="competences-menu"
            class="technos"
            role="menu"
          >
            <li v-for="(tech, idx) in technosList" :key="idx" role="menuitem">
              {{ tech.title }}
            </li>
            <li role="menuitem">
              <a href="#technos">Plus d'informations</a>
            </li>
          </ul>
        </li>
        <li class="CV">
          <a href="">Mon CV</a>
        </li>
        <li class="contact">
          <a href="#contact">Discutons</a>
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
  padding: 20px;
  min-height: 100%;
  overflow: hidden;

  &.is-portrait {
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 20px;

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
    transition: transform 0.4s ease;

    .animated {
      height: 48px;
    }

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

  .main-menu {
    position: relative;
    align-self: start;
    z-index: 1;

    > ul {
      display: flex;
      gap: 30px;
      list-style: none;
    }

    li {
      position: relative;
    }
  }
}

.competences-btn {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: inherit;
  padding: 0;
  font-weight: inherit;
  transition: color 0.2s ease;

  &:hover,
  &:focus {
    color: rgba(white, 0.8);
    outline: 2px solid rgba(white, 0.4);
    outline-offset: 2px;
  }

  &[aria-expanded="true"] {
    color: white;
  }
}

#competences-menu {
  list-style: none;
  padding: 0;
  margin: 10px 0 0 0;
  position: absolute;
  top: 100%;
  left: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  border-radius: 4px;
  min-width: 220px;
  animation: slideDown 0.3s ease-out;
  z-index: 10;

  li {
    padding: 10px 15px;
    transition: background-color 0.2s ease;

    &:first-child {
      border-radius: 4px 4px 0 0;
    }

    &:last-child {
      border-radius: 0 0 4px 4px;
    }

    &:hover {
      background-color: rgba(white, 0.1);
    }

    &[role="menuitem"]:focus-within {
      background-color: rgba(white, 0.15);
      outline: 2px solid rgba(white, 0.4);
      outline-offset: -2px;
    }

    a {
      color: inherit;
      text-decoration: none;
      display: block;

      &:focus {
        outline: 2px solid rgba(white, 0.4);
        outline-offset: 2px;
      }
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
