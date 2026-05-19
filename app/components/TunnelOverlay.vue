<script setup lang="ts">
import { computed, watch, onBeforeUnmount } from "vue";

const props = withDefaults(
  defineProps<{
    active: boolean;
    phase?: "enter" | "exit";
    x: number;
    y: number;
    kind?: "default" | "internal" | "external";
  }>(),
  {
    phase: "enter",
    kind: "default",
  },
);

const overlayStyle = computed(() => ({
  "--tunnel-x": `${props.x}px`,
  "--tunnel-y": `${props.y}px`,
}));

const emit = defineEmits<{
  (e: "entered"): void;
  (e: "exited"): void;
}>();

// Timings hardcoded inside the overlay (single source of truth).
const ENTER_MS = 650;
const EXIT_MS = 650;

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
  () => [props.active, props.phase] as const,
  ([active, phase]) => {
    if (!active) {
      clearTimers();
      return;
    }

    clearTimers();

    if (phase === "enter") {
      enterTimer = window.setTimeout(() => {
        emit("entered");
        enterTimer = null;
      }, ENTER_MS);
    } else if (phase === "exit") {
      exitTimer = window.setTimeout(() => {
        emit("exited");
        exitTimer = null;
      }, EXIT_MS);
    }
  },
);

onBeforeUnmount(() => clearTimers());
</script>

<template>
  <div
    v-if="active"
    class="tunnelOverlay"
    :class="[`is-${kind}`, `is-${phase}`]"
    :style="overlayStyle"
    aria-hidden="true"
  />
</template>

<style lang="scss" scoped>
.tunnelOverlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  background: #000;
  will-change: clip-path;

  &.is-enter {
    clip-path: circle(0 at var(--tunnel-x) var(--tunnel-y));
    animation: tunnel-fill 650ms ease-in forwards;
  }

  &.is-exit {
    clip-path: circle(150vmax at var(--tunnel-x) var(--tunnel-y));
    animation: tunnel-reveal 650ms ease-out forwards;
  }

  &.is-external::after,
  &.is-internal::after,
  &.is-default::after {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at var(--tunnel-x) var(--tunnel-y),
      rgba(255, 255, 255, 0.08),
      rgba(0, 0, 0, 0.2) 20%,
      rgba(0, 0, 0, 0.95) 58%,
      #000 72%
    );
    opacity: 0.95;
  }
}

@keyframes tunnel-fill {
  from {
    clip-path: circle(0 at var(--tunnel-x) var(--tunnel-y));
  }

  to {
    clip-path: circle(150vmax at var(--tunnel-x) var(--tunnel-y));
  }
}

@keyframes tunnel-reveal {
  from {
    clip-path: circle(150vmax at var(--tunnel-x) var(--tunnel-y));
  }

  to {
    clip-path: circle(0 at var(--tunnel-x) var(--tunnel-y));
  }
}
</style>
