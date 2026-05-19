<script setup lang="ts">
import { computed, watch, onBeforeUnmount } from "vue";

// This overlay implements a single, hardcoded "morph"-like animation.
// Timings and transitions are owned by this component.
const props = defineProps<{
  active: boolean;
  stage: "out" | "in";
  currentHtml: string;
  targetHtml: string;
  currentColor: string;
  targetColor: string;
  backgroundColor: string;
  currentWidth: number;
  currentHeight: number;
  targetWidth: number;
  targetHeight: number;
}>();

const emit = defineEmits<{
  (e: "entered"): void;
  (e: "exited"): void;
}>();

// Timings (ms) for this "morph" overlay — hardcoded here.
const ENTER_MS = 320; // time before emitting 'entered' during enter phase
const EXIT_MS = 340; // time before emitting 'exited' during exit phase

let enterTimer: number | null = null;
let exitTimer: number | null = null;

function clearTimers() {
  if (enterTimer !== null) {
    window.clearTimeout(enterTimer);
    enterTimer = null;
  }
  if (exitTimer !== null) {
    window.clearTimeout(exitTimer);
    exitTimer = null;
  }
}

watch(
  () => [props.active, props.stage],
  ([active, stage]) => {
    clearTimers();

    if (!active) return;

    if (stage === "out") {
      // entering overlay: after ENTER_MS, notify provider
      enterTimer = window.setTimeout(() => {
        emit("entered");
        enterTimer = null;
      }, ENTER_MS);
    } else if (stage === "in") {
      // exiting overlay: after EXIT_MS, notify provider
      exitTimer = window.setTimeout(() => {
        emit("exited");
        exitTimer = null;
      }, EXIT_MS);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => clearTimers());

const overlayStyle = computed(() => ({
  backgroundColor: props.backgroundColor,
}));

// Morph behavior hardcoded: current shrinks to 0 on 'out', target starts at 0
const currentStyle = computed(() => ({
  width: props.stage === "out" ? "0px" : `${props.currentWidth}px`,
  height: props.stage === "out" ? "0px" : `${props.currentHeight}px`,
  opacity: 1,
  transform: "translate(-50%, -50%)",
}));

const targetStyle = computed(() => ({
  width: props.stage === "out" ? "0px" : `${props.targetWidth}px`,
  height: props.stage === "out" ? "0px" : `${props.targetHeight}px`,
  opacity: 1,
  transform: "translate(-50%, -50%)",
}));
</script>

<template>
  <div
    v-if="active"
    class="sectionTransitionOverlay"
    :style="overlayStyle"
    aria-hidden="true"
  >
    <div
      class="sectionTransitionOverlay__content sectionTransitionOverlay__content--current"
      :style="currentStyle"
    >
      <div class="sectionTransitionOverlay__inner" v-html="currentHtml" />
    </div>

    <div
      class="sectionTransitionOverlay__content sectionTransitionOverlay__content--target"
      :style="targetStyle"
    >
      <div class="sectionTransitionOverlay__inner" v-html="targetHtml" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.sectionTransitionOverlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  transition: background-color 320ms ease;
  overflow: hidden;

  &__content {
    position: absolute;
    top: 50%;
    left: 50%;
    overflow: hidden;
    transition:
      width 320ms ease,
      height 320ms ease,
      opacity 220ms ease,
      transform 320ms ease;
    will-change: width, height, opacity, transform;
  }

  &__content--current {
    opacity: 1;
  }

  &__content--target {
    opacity: 1;
  }

  &__inner {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
}
</style>
