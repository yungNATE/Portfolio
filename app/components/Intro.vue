<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import PlayASCIIFrames from "../utils/PlayASCIIFrames_fixed";
import type { PlayASCIIFramesInstance } from "../utils/PlayASCIIFrames_fixed";
import { frames } from "../assets/js/ASCIISelfieFrames2.js";
import { useScreenInfo } from "../utils/screen";

const roles = [
  "Informaticien",
  "Développeur Frontend",
  "& créatif",
  "UX Designer",
  "Motion Enthusiast",
  "Light Enthusiast",
];

const asciiArt = ref<HTMLElement | null>(null);
const { screenMode } = useScreenInfo();
const activeIndex = ref(0);
let asciiPlayer: PlayASCIIFramesInstance | null = null;
let titlesInterval: number | null = null;

// Circular distance to the active role, in [-n/2, n/2[ → -1 = previous, 0 = active, 1 = next
const roleOffsets = computed(() => {
  const n = roles.length;
  return roles.map((_, index) => {
    const offset = (index - activeIndex.value + n) % n;
    return offset >= n / 2 ? offset - n : offset;
  });
});

function stopTitleAnimation() {
  if (titlesInterval) {
    clearInterval(titlesInterval);
    titlesInterval = null;
  }
  activeIndex.value = 0;
}

function startTitleAnimation() {
  stopTitleAnimation(); // Clean reset before starting

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const delay = 2000; // ms
  titlesInterval = window.setInterval(() => {
    activeIndex.value = (activeIndex.value + 1) % roles.length;
  }, delay);
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
    <!-- <pre ref="asciiArt" class="ascii-art"></pre> -->
    <!-- <AsciiVideoBackground
      src="/coucou.mp4"
      mode="dots"
      color="#000"
      :cols="140"
      :opacity="0.2"
    /> -->

    <WipNotice />

    <div class="titles">
      <SectionHeading eyebrow="Salut, moi c'est" :level="1">
        Nathan <br class="name-break" />Martinigol
      </SectionHeading>
      <p class="sr-only">{{ roles.join(", ") }}</p>
      <ul class="roles" aria-hidden="true">
        <li
          v-for="(role, index) in roles"
          :key="role"
          :class="{
            active: roleOffsets[index] === 0,
            near: Math.abs(roleOffsets[index] ?? 0) === 1,
          }"
          :style="{ '--offset': roleOffsets[index] }"
        >
          {{ role }}
        </li>
      </ul>
    </div>

    <SkillGraph />

    <nav class="main-menu">
      <ul>
        <li class="CV">
          <a href="/Frontend_CV_MartinigolNathan.pdf" class="external">CV</a>
        </li>
        <li class="contact">
          <a
            href="https://www.linkedin.com/in/martinigol/"
            class="external"
            target="_blank"
            >Linkedin</a
          >
        </li>
        <li class="contact">
          <a href="#contact" class="anchor">Discutons</a>
        </li>
      </ul>
    </nav>
  </div>
</template>

<style lang="scss">
.introWrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row;
  // min-height: 100%;
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
  }

  &.is-portrait .name-break {
    display: block;
  }

  .titles {
    position: relative;
    align-self: flex-start;
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    color: white;

    .name-break {
      display: none;
    }
  }

  // Roller: 3 visible lines (previous / active / next), roles slide upward
  .roles {
    --line: 1.3em;
    --duration: 0.6s;

    position: relative;
    height: calc(var(--line) * 3);
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: calc(var(--section-title-size) * 0.5);
    font-weight: bold;

    li {
      position: absolute;
      top: var(--line); // Middle slot
      left: 0;
      height: var(--line);
      line-height: var(--line);
      white-space: nowrap;
      transform-origin: left center;
      transform: translateY(calc(var(--offset) * 100%)) scale(0.6);
      opacity: 0;
      transition:
        transform var(--duration) cubic-bezier(0.65, 0, 0.35, 1),
        opacity var(--duration) ease;

      &.near {
        transform: translateY(calc(var(--offset) * 100%)) scale(0.75);
        opacity: 0.25;
      }

      &.active {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      li {
        transition: none;
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
  z-index: -1;
  pointer-events: none;

  opacity: 0.3;

  font-family: "Courier New", monospace;
  font-size: clamp(0.34rem, 0.65vw, 999vh);
  line-height: 1;
  letter-spacing: 0;
  white-space: pre;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  color: black;
}
</style>
