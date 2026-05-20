<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    active: boolean;
    stage: "out" | "colorTransition" | "in";
    currentColor: string;
    targetColor: string;
    outDurationMs?: number;
    colorDurationMs?: number;
    inDurationMs?: number;
  }>(),
  {
    outDurationMs: 2000,
    colorDurationMs: 2000,
    inDurationMs: 2000,
  },
);

const emit = defineEmits<{
  (e: "entered"): void;
  (e: "colorTransitioned"): void;
  (e: "exited"): void;
}>();

let enterTimer: number | null = null;
let colorTimer: number | null = null;
let exitTimer: number | null = null;
let animationFrameId: number | null = null;
const isExpanded = ref(false);
const isColorTransitioning = ref(false);
const displayedColor = ref(props.currentColor);

function clearTimers() {
  if (animationFrameId !== null) {
    window.cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  if (enterTimer !== null) {
    window.clearTimeout(enterTimer);
    enterTimer = null;
  }

  if (colorTimer !== null) {
    window.clearTimeout(colorTimer);
    colorTimer = null;
  }

  if (exitTimer !== null) {
    window.clearTimeout(exitTimer);
    exitTimer = null;
  }
}

function resetOverlayState() {
  isExpanded.value = false;
  isColorTransitioning.value = false;
  displayedColor.value = props.currentColor;
}

watch(
  () => [props.active, props.stage] as const,
  ([active, stage]) => {
    clearTimers();

    if (!active) {
      resetOverlayState();
      return;
    }

    switch (stage) {
      case "out":
        isExpanded.value = false;
        isColorTransitioning.value = false;
        displayedColor.value = props.currentColor;

        requestAnimationFrame(() => {
          isExpanded.value = true;
        });
        setTimeout(() => {
          emit("entered");
        }, props.outDurationMs);
        break;

      case "colorTransition":
        isExpanded.value = true;
        isColorTransitioning.value = true;
        displayedColor.value = props.targetColor;
        setTimeout(() => {
          emit("colorTransitioned");
        }, props.colorDurationMs);
        break;

      case "in":
        isExpanded.value = true;
        isColorTransitioning.value = false;
        requestAnimationFrame(() => {
          isExpanded.value = false;
        });
        setTimeout(() => {
          emit("exited");
        }, props.inDurationMs);
        break;
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => clearTimers());

const overlayStyle = computed(
  () =>
    ({
      backgroundColor: displayedColor.value,
      transformOrigin: props.stage === "out" ? "top left" : "bottom right",
      transform: isExpanded.value ? "scale(1)" : "scale(0)",
      "--out-duration": `${props.outDurationMs}ms`,
      "--color-duration": `${props.colorDurationMs}ms`,
      "--in-duration": `${props.inDurationMs}ms`,
      "--stage": props.stage === "out" ? "'out'" : "'in'",
    }) as any,
);
</script>

<template>
  <div
    v-if="active"
    class="sectionTransitionOverlay"
    aria-hidden="true"
    :data-stage="stage"
  >
    <div class="sectionTransitionOverlay__rect" :style="overlayStyle" />
  </div>
</template>

<style lang="scss" scoped>
.sectionTransitionOverlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  overflow: hidden;
}

.sectionTransitionOverlay__rect {
  position: absolute;
  inset: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  will-change: transform, background-color;
}

/* Stage "out": transform first, then background-color with delay */
.sectionTransitionOverlay[data-stage="out"] .sectionTransitionOverlay__rect {
  transition:
    transform var(--out-duration) cubic-bezier(0.2, 0.75, 0.2, 1) 0ms,
    background-color var(--color-duration) ease var(--out-duration);
}

/* Stage "colorTransition": just background-color */
.sectionTransitionOverlay[data-stage="colorTransition"]
  .sectionTransitionOverlay__rect {
  transition: background-color var(--color-duration) ease 0ms;
}

/* Stage "in": just transform */
.sectionTransitionOverlay[data-stage="in"] .sectionTransitionOverlay__rect {
  transition: transform var(--in-duration) cubic-bezier(0.2, 0.75, 0.2, 1) 0ms;
}
</style>
