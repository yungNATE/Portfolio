<template>
  <div
    ref="rootEl"
    class="handContainer"
    :class="{ handMirror: props.sens === 'gauche' }"
    aria-hidden="true"
  >
    <div
      :ref="(el) => setHandRef(el as HTMLElement | null)"
      class="hand"
      :data-state="props.state"
    >
      <div class="topFingers" aria-hidden="true">
        <div
          v-for="(finger, i) in topFingersData"
          :key="i"
          :ref="(el) => setTopFingerRef(el as HTMLElement | null, i + 1)"
          class="finger finger--top"
          :class="{ 'finger--pointing': i === 0 }"
          :data-index="i + 1"
          :style="{
            '--phalanxBaseHeight': `${finger.phalanxBaseHeight}px`,
            '--fold-topOffset': `${finger.topOffset * -3}px`,
          }"
        >
          <div class="phalanx square phalanx--tip"></div>
          <div class="phalanx square phalanx--base"></div>
        </div>
      </div>

      <div
        :ref="(el) => setTopFingerRef(el as HTMLElement | null, 0)"
        class="finger finger--thumb"
        :data-index="0"
        :style="{
          '--phalanxBaseHeight': `${thumbData.phalanxBaseHeight}px`,
        }"
      >
        <div class="phalanx square phalanx--tip"></div>
        <div class="phalanx square phalanx--base"></div>
      </div>

      <div class="palm square"></div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  toRef,
  type VNodeRef,
} from "vue";
import {
  useHandAnimation,
  type HandState,
  type FingerData,
} from "../composables/useHandAnimation";
type HandSens = "droite" | "gauche";

const props = withDefaults(
  defineProps<{
    state?: HandState;
    sens?: HandSens;
  }>(),
  { state: "idle", sens: "droite" },
);

const multiplicator = 56;
const thumbData = { phalanxBaseHeight: 40, topOffset: 0 } as const;
const topFingersData = [
  { phalanxBaseHeight: 0.9 * multiplicator, topOffset: 0 },
  { phalanxBaseHeight: 1 * multiplicator, topOffset: 1 },
  { phalanxBaseHeight: 0.9 * multiplicator, topOffset: 0 },
  { phalanxBaseHeight: 0.7 * multiplicator, topOffset: -1 },
] as const;
const fingersData: readonly FingerData[] = [thumbData, ...topFingersData];

const stateRef = toRef(props, "state");

const { rootEl, setTopFingerRef, mount, destroy, setHandRef } =
  useHandAnimation(stateRef as any, fingersData, multiplicator);

onMounted(async () => {
  await nextTick();
  mount(rootEl.value);
});

onBeforeUnmount(() => {
  destroy();
});
</script>

<style lang="scss" scoped>
.handContainer {
  height: fit-content;
  width: fit-content;
}

.square {
  border-radius: 30%;
  background: #050505;
}

.handMirror {
  transform: scaleX(-1);
}

.hand {
  transform: translateY(0px) rotateZ(0deg);
  margin-top: 100px;
  width: fit-content;
  will-change: transform;
}

.palm {
  width: 96px;
  aspect-ratio: 0.9;
  border-radius: 15%;
  border-bottom-right-radius: 45%;
  border-bottom-left-radius: 30%;
}

.topFingers {
  position: absolute;
  bottom: 98%;
  width: 100%;
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  pointer-events: none;
}

.finger {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  --finger-x: -10deg;
  --finger-z: 0deg;
  transform: rotateX(var(--finger-x)) rotateZ(var(--finger-z));
  will-change: transform;

  &--top {
    position: relative;
    top: var(--fold-topOffset);
  }

  &--thumb {
    right: 82%;
    bottom: 29%;
    transform-origin: bottom;
    --finger-x: -22deg;
    --finger-z: -38deg;
  }
}

.phalanx {
  width: 18px;
  height: var(--phalanxBaseHeight);
  transform: translateY(6px);
  border-radius: 5px;
  will-change: height;

  &--tip {
    height: calc(var(--phalanxBaseHeight) * 0.8);
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
  }

  &--base {
    // border-top-left-radius: 0px;
    // border-top-right-radius: 0px;
  }

  .finger--thumb & {
    width: 22px;
  }
}

@media (max-width: 720px) {
  .handContainer {
    order: -1;
    height: 220px;
  }

  .hand {
    right: auto;
    left: 50%;
    transform: translateX(-50%) scale(0.82);
  }
}
</style>
