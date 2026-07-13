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
      <div
        class="topFingers"
        aria-hidden="true"
        :ref="(el) => setTopFingersRef(el as HTMLElement | null)"
      >
        <div
          v-for="(finger, i) in topFingersData"
          :key="i"
          :ref="(el) => setFingerRef(el as HTMLElement | null, i + 1)"
          class="finger finger--top"
          :class="{ 'finger--pointing': i === 0 }"
          :data-index="i + 1"
          :style="{
            '--phalanxBaseHeight': `${finger.phalanxBaseHeight}px`,
            '--fold-topOffset': `${finger.topOffset * 3}px`,
          }"
        >
          <div class="phalanx square phalanx--tip"></div>
          <div class="phalanx square phalanx--base"></div>
        </div>
      </div>

      <div
        :ref="(el) => setFingerRef(el as HTMLElement | null, 0)"
        class="finger finger--thumb"
        :data-index="0"
        :style="{
          '--phalanxBaseHeight': `${thumbData.phalanxBaseHeight}px`,
        }"
      >
        <div class="phalanx square phalanx--tip"></div>
        <div class="phalanx square phalanx--base"></div>
      </div>

      <div
        class="palm square"
        :ref="(el) => setPalmRef(el as HTMLElement | null)"
      ></div>
    </div>
  </div>

  <Teleport to="body">
    <div
      class="successReveal"
      :ref="(el) => setSuccessRevealRef(el as HTMLElement | null)"
    >
      <div class="successStage">
        <div
          class="hand successHand"
          :ref="(el) => setSuccessHandRef(el as HTMLElement | null)"
        >
          <div class="topFingers" aria-hidden="true">
            <div
              v-for="(finger, i) in topFingersData"
              :key="`success-${i}`"
              class="finger finger--top"
              :class="{ 'finger--pointing': i === 0 }"
              :data-index="i + 1"
              :style="{
                '--phalanxBaseHeight': `${finger.phalanxBaseHeight}px`,
                '--fold-topOffset': `${finger.topOffset * 3}px`,
              }"
            >
              <div class="phalanx square phalanx--tip"></div>
              <div class="phalanx square phalanx--base"></div>
            </div>
          </div>

          <div
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

        <p
          class="successMessage h1"
          :ref="(el) => setSuccessTextRef(el as HTMLElement | null)"
        >
          À bientôt !
        </p>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { nextTick, onBeforeUnmount, onMounted, toRef, watch } from "vue";
import {
  useHandAnimation,
  type HandState,
  type FingerData,
} from "../composables/useHandAnimation";

const props = withDefaults(
  defineProps<{
    state?: HandState;
    sens?: HandSens;
    formRef?: HTMLElement | null;
    handWrapperRef?: HTMLElement | null;
    contactLayoutRef?: HTMLElement | null;
  }>(),
  { state: "idle", sens: "droite" },
);
type HandSens = "droite" | "gauche";

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

const {
  rootEl,
  setFingerRef,
  setTopFingersRef,
  setFormRef,
  setHandWrapperRef,
  setContactLayoutRef,
  setSuccessRevealRef,
  setSuccessHandRef,
  setSuccessTextRef,
  mount,
  destroy,
  setHandRef,
  setPalmRef,
} = useHandAnimation(stateRef as any, fingersData, multiplicator);

onMounted(async () => {
  await nextTick();
  mount(rootEl.value);
  if (props.formRef) {
    setFormRef(props.formRef);
  }
  if (props.handWrapperRef) {
    setHandWrapperRef(props.handWrapperRef);
  }
  if (props.contactLayoutRef) {
    setContactLayoutRef(props.contactLayoutRef);
  }
});

onBeforeUnmount(() => {
  destroy();
});

watch(
  () => props.formRef,
  (newFormEl) => {
    setFormRef(newFormEl || null);
  },
);

watch(
  () => props.handWrapperRef,
  (newHandWrapperEl) => {
    setHandWrapperRef(newHandWrapperEl || null);
  },
);

watch(
  () => props.contactLayoutRef,
  (newContactLayoutEl) => {
    setContactLayoutRef(newContactLayoutEl || null);
  },
);
</script>

<style lang="scss" scoped>
.handContainer {
  height: fit-content;
  width: fit-content;
  position: relative;
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

.successReveal {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none;
  opacity: 0;
  z-index: 999;
}

.successStage {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  aspect-ratio: 0.9;
}

.successHand {
  position: relative;
  margin-top: 0;
  z-index: 2;
  transform-origin: bottom center;
}

.successMessage {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translate(0%, -50%);
  pointer-events: none;
  z-index: 1;
  margin: 0;
  padding: 0.45rem 0.75rem;
  white-space: nowrap;
  clip-path: polygon(0 0, 50% 0, 50% 100%, 0% 100%);
  will-change: transform, opacity, clip-path;
}

.palm {
  width: 96px;
  aspect-ratio: 0.9;
  border-radius: 15%;
  border-bottom-right-radius: 45%;
  border-bottom-left-radius: 30%;
  position: relative;
  z-index: 1;
}

.topFingers {
  position: absolute;
  bottom: 98%;
  width: 80%;
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
  z-index: 1;

  &--top {
    // position: relative;
    bottom: var(--fold-topOffset);

    $fingersNb: 4;
    @for $fingerIndex from 1 through $fingersNb {
      &:nth-child(#{$fingerIndex}) {
        left: #{calc((100 / ($fingersNb - 1)) * ($fingerIndex - 1)) + "%"};
      }
    }
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

  // &--base {
  //   // border-top-left-radius: 0px;
  //   // border-top-right-radius: 0px;
  // }

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
