<script setup lang="ts">
import { computed } from "vue";

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
