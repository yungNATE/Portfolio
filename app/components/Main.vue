<template>
  <aside class="handStage" aria-hidden="true">
    <div class="hand" :class="`hand--${state}`">
      <div class="topFingers" aria-hidden="true">
        <div
          v-for="(finger, i) in topFingers"
          :key="i"
          class="finger finger--top"
          :class="{
            'finger--pointing': i === 0,
            'finger--folded':
              i !== 0 && (state === 'warning' || state === 'error'),
          }"
          :style="{
            '--phalanxBaseHeight': `${finger.phalanxBaseHeight}px`,
            '--fold-delay': `${160 / (i + 1)}ms`,
            '--fold-topOffset': `${(i + 1) * 3}px`,
          }"
        >
          <div
            class="phalanx square phalanx--tip"
            :class="{
              'phalanx--folded': state === 'warning' || state === 'error',
            }"
          ></div>
          <div class="phalanx square phalanx--base"></div>
        </div>
      </div>

      <div
        class="finger finger--thumb"
        :style="{
          '--phalanxBaseHeight': '35px',
        }"
      >
        <div class="phalanx square phalanx--tip"></div>
        <div class="phalanx square phalanx--base"></div>
      </div>

      <div class="palm square"></div>
    </div>
  </aside>
</template>

<script lang="ts" setup>
type HandState =
  | "idle"
  | "active"
  | "warning"
  | "sending"
  | "success"
  | "error";

withDefaults(
  defineProps<{
    state?: HandState;
  }>(),
  {
    state: "idle",
  },
);

const multiplicator = 56;
const topFingers = [
  { phalanxBaseHeight: 0.9 * multiplicator },
  { phalanxBaseHeight: 1 * multiplicator },
  { phalanxBaseHeight: 0.9 * multiplicator },
  { phalanxBaseHeight: 0.7 * multiplicator },
] as const;
</script>

<style lang="scss" scoped>
.handStage {
  position: relative;
  height: 320px;
  perspective: 900px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.square {
  border-radius: 30%;
  background: #050505;
}

.hand {
  transform-origin: 55% 100%;
  transform: translateY(0px) rotateZ(0deg);
  animation: handIdleFloat 2.8s ease-in-out infinite;
  margin-top: 100px;
  width: fit-content;

  &--active {
    animation-duration: 1.9s;

    .finger--top {
      --finger-x: -16deg;
    }
  }

  &--warning,
  &--error {
    .finger--pointing {
      animation: fingerNo 0.72s ease-in-out infinite;
    }
  }

  &--sending {
    animation: handSendPulse 0.75s ease-in-out infinite;

    .finger--top {
      animation: sendingTap 0.7s ease-in-out infinite;
    }
  }

  &--success {
    .finger--thumb {
      --finger-x: -8deg;
      --finger-z: -70deg;
    }

    .finger--pointing {
      --finger-x: -26deg;
    }
  }
}

.palm {
  width: 96px;
  aspect-ratio: 0.9;
  border-radius: 21%;
}

.topFingers {
  position: absolute;
  bottom: 98%;
  width: 100%;
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  pointer-events: none;
  padding-inline: 5px;
}

.finger {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform-origin: 50% 100%;
  --finger-x: -10deg;
  --finger-z: 0deg;
  transform: rotateX(var(--finger-x)) rotateZ(var(--finger-z));
  transition: transform 0.28s ease;

  &--top {
    position: relative;
    top: 0;
  }

  &--thumb {
    right: 91%;
    bottom: 32%;
    --finger-x: -22deg;
    --finger-z: -38deg;
  }
}

.phalanx {
  width: 18px;
  height: var(--phalanxBaseHeight);
  transform: translateY(6px);
  border-radius: 5px;

  &--tip {
    transform-origin: 50% 100%;
    height: calc(var(--phalanxBaseHeight) * 0.8);
  }
}
.finger--folded {
  $totalAnimationDuration: 1000ms;
  $classicFoldDuration: $totalAnimationDuration / 3;
  $fingerFoldedDuration: 80ms;
  $phalanxBaseDuration: 160ms;

  top: var(--fold-topOffset);
  transition: top $classicFoldDuration ease-in;
  transition-delay: calc(var(--fold-delay) + $classicFoldDuration * 1);

  .phalanx {
    &--tip {
      height: 0;
      transition: height $classicFoldDuration ease-in;
      transition-delay: var(--fold-delay);
    }

    &--base {
      position: relative;
      height: 22px;
      transition:
        height $classicFoldDuration ease-in,
        top $classicFoldDuration ease-in;
      transition-delay: calc(var(--fold-delay) + $classicFoldDuration * 0.5);
    }
  }
}

@media (max-width: 720px) {
  .handStage {
    order: -1;
    height: 220px;
  }

  .hand {
    right: auto;
    left: 50%;
    transform: translateX(-50%) scale(0.82);
  }
}

@keyframes handIdleFloat {
  0%,
  100% {
    transform: translateY(0px) rotateZ(0deg);
  }
  50% {
    transform: translateY(-7px) rotateZ(0.6deg);
  }
}

@keyframes fingerNo {
  0%,
  100% {
    transform: rotateX(-28deg) rotateZ(-11deg);
  }
  50% {
    transform: rotateX(-28deg) rotateZ(11deg);
  }
}

@keyframes handSendPulse {
  0%,
  100% {
    transform: translateY(0px) rotateZ(0deg);
  }
  50% {
    transform: translateY(-6px) rotateZ(-1.2deg);
  }
}

@keyframes sendingTap {
  0%,
  100% {
    transform: rotateX(-8deg) rotateZ(0deg);
  }
  50% {
    transform: rotateX(22deg) rotateZ(0deg);
  }
}
</style>
