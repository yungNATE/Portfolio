import gsap from "gsap";
import { nextTick, ref, type Ref, watch, onBeforeUnmount } from "vue";
import { ssrGetDirectiveProps } from "vue/server-renderer";

export type HandState =
  | "idle"
  | "active"
  | "warning"
  | "insult"
  | "sending"
  | "success"
  | "error";

type HandAnimationIntent =
  | "wave"
  | "no"
  | "middleFinger"
  | "sending"
  | "success";

type FingerData = { phalanxBaseHeight: number; topOffset: number };

export function useHandAnimation(
  stateRef: Ref<HandState>,
  fingersData: readonly FingerData[],
  multiplicator = 56,
) {
  // Utils
  const rootEl = ref<HTMLElement | null>(null);
  const handEl = ref<HTMLElement | null>(null);
  const thumbEl = ref<HTMLElement | null>(null);
  const topFingersEl = ref<HTMLElement | null>(null);
  const palmEl = ref<HTMLElement | null>(null);
  const fingerMap = ref<Map<number, HTMLElement>>(new Map());

  let ctx: gsap.Context | null = null;
  let idleTween: gsap.core.Tween | null = null;
  let sendingTween: gsap.core.Tween | null = null;
  let sendingTapTween: gsap.core.Tween | null = null;
  let fingerNoDelayTween: gsap.core.Tween | null = null;
  let fingerNoTween: gsap.core.Tween | gsap.core.Timeline | null = null;

  const baseIdleDuration = 1.9;
  const classicFoldDuration = 1 / 3;
  const fingerRotateDuration = 0.28;
  const baseThumbRotation = { x: 0, z: -38 };

  const getTopFingers = () => {
    // Return ordered array of finger elements sorted by data-index
    const entries = Array.from(fingerMap.value.entries())
      .filter(([idx]) => idx > 0)
      .sort((a, b) => a[0] - b[0])
      .map(([_, el]) => el);
    return entries;
  };

  const fingerBaseheight = (fingerIndex: number) => {
    const baseHeight =
      fingersData[fingerIndex]?.phalanxBaseHeight ?? multiplicator;
    return baseHeight;
  };

  const setFingerRef = (el: HTMLElement | null, index: number) => {
    if (!el) {
      fingerMap.value.delete(index);
      return;
    }
    fingerMap.value.set(index, el);
    if (index === 0) thumbEl.value = el;
  };

  const setTopFingersRef = (el: HTMLElement | null) => {
    topFingersEl.value = el;
  };

  const setHandRef = (el: HTMLElement | null) => {
    handEl.value = el;
  };

  const setPalmRef = (el: HTMLElement | null) => {
    palmEl.value = el;
  };

  const setBasePose = () => {
    const topFingers = getTopFingers();
    if (handEl.value) {
      gsap.set(handEl.value, {
        transformOrigin: "bottom",
        x: 0,
        y: 0,
        rotationZ: 0,
      });
    }

    if (topFingers.length) {
      gsap.set(topFingers, {
        transformOrigin: "bottom",
        rotationX: 0,
        rotationZ: 0,
      });
    }

    if (thumbEl.value) {
      gsap.set(thumbEl.value, {
        transformOrigin: "bottom",
        rotationX: baseThumbRotation.x,
        rotationZ: baseThumbRotation.z,
        right: "82%",
        bottom: "29%",
      });

      gsap.set(thumbEl.value.querySelector(".phalanx--base"), {
        transformOrigin: "bottom",
      });
      gsap.set(thumbEl.value.querySelector(".phalanx--tip"), {
        transformOrigin: "bottom",
      });
    }

    topFingers.forEach((el, i) => {
      const baseHeight = fingersData[i + 1]?.phalanxBaseHeight ?? multiplicator;
      const tipHeight = baseHeight * 0.8;
      const tipEl = el.querySelector<HTMLElement>(".phalanx--tip");
      const baseEl = el.querySelector<HTMLElement>(".phalanx--base");
      if (tipEl) {
        gsap.set(tipEl, {
          height: tipHeight,
          rotationX: 0,
          transformOrigin: "bottom",
        });
      }
      if (baseEl) {
        gsap.set(baseEl, {
          height: baseHeight,
          rotationX: 0,
          transformOrigin: "bottom",
        });
      }
    });
  };

  const startWaveMotion = (speed = 1) => {
    if (!handEl.value) return;
    if (!idleTween) {
      gsap.set(handEl.value, { rotationZ: 0 });
      idleTween = gsap.to(handEl.value, {
        rotationZ: 24,
        x: 5,
        y: 5,
        duration: baseIdleDuration / 2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    }
    idleTween.timeScale(speed).play();
  };

  const stopWaveMotion = () => {
    if (!idleTween || !handEl.value) return;
    idleTween.progress(0).pause();
    gsap.set(handEl.value, { x: 0, rotationZ: 0 });
  };

  const startFingerNo = () => {
    const topFingers = getTopFingers();
    const pointing = topFingers[0];
    if (!pointing) return;
    fingerNoTween = gsap.timeline({
      repeat: -1,
      yoyo: true,
      defaults: { ease: "sine.inOut" },
    });
    fingerNoTween.to(pointing, { rotationZ: -11, duration: 0.72 / 2 });
    fingerNoTween.to(pointing, { rotationZ: 11, duration: 0.72 / 2 });
  };

  const stopFingerNo = () => {
    fingerNoDelayTween?.kill();
    fingerNoDelayTween = null;
    fingerNoTween?.kill();
    fingerNoTween = null;

    const topFingers = getTopFingers();
    const pointing = topFingers[0];
    if (!pointing) return;
    gsap.killTweensOf(pointing);
    gsap.set(pointing, { rotationZ: 0 });
  };

  const startFingerNoAfterFold = (delay: number) => {
    fingerNoDelayTween?.kill();
    if (delay <= 0) {
      startFingerNo();
      return;
    }
    fingerNoDelayTween = gsap.delayedCall(delay, startFingerNo);
  };

  const startSending = () => {
    const topFinger = getTopFingers();
    if (handEl.value) {
      sendingTween = gsap.to(handEl.value, {
        y: -6,
        rotationZ: -1.2,
        duration: 0.75 / 2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    }
    if (topFinger.length) {
      sendingTapTween = gsap.fromTo(
        topFinger,
        { rotationX: -8 },
        {
          rotationX: 22,
          duration: 0.7 / 2,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        },
      );
    }
  };

  const stopSending = () => {
    sendingTween?.kill();
    sendingTapTween?.kill();
    sendingTween = null;
    sendingTapTween = null;
  };

  const setPointingRotationX = (value: number) => {
    const topFingers = getTopFingers();
    const pointing = topFingers[0];
    if (!pointing) return;
    gsap.to(pointing, {
      rotationX: value,
      duration: fingerRotateDuration,
      ease: "power2.out",
      overwrite: "auto",
    });
  };

  const resetTopFingerRotationZ = () => {
    const topFingers = getTopFingers();
    if (!topFingers.length) return;
    gsap.to(topFingers, {
      rotationZ: 0,
      duration: fingerRotateDuration,
      ease: "power2.out",
      overwrite: "auto",
    });
  };

  const setThumbRotation = (x: number, z: number) => {
    if (!thumbEl.value) return;
    gsap.to(thumbEl.value, {
      rotationX: x,
      rotationZ: z,
      duration: fingerRotateDuration,
      ease: "power2.out",
      overwrite: "auto",
    });
  };

  const morphIntoBar = () => {
    const width = 18;
    const tl = gsap.timeline({
      defaults: { duration: 0.4, ease: "power2.inOut" },
    });

    // Morph fingers
    if (topFingersEl.value) {
      tl.to(topFingersEl.value, { width: 0 }, 0);
      const topFingers = getTopFingers();
      topFingers.forEach((el) => {
        gsap.set(el.querySelector(".phalanx--base"), { borderRadius: 0 });
        gsap.set(el.querySelector(".phalanx--tip"), { borderRadius: 0 });
      });
    }

    // morph hand
    if (palmEl.value) {
      tl.to(
        palmEl.value,
        {
          width: width,
          borderRadius: 0,
          height: 300,
        },
        0,
      );
    }

    // retract thumb
    if (thumbEl.value) {
      setThumbRotation(0, 0);
      gsap.set(thumbEl.value, { right: 0 });
      gsap.set(thumbEl.value.querySelector(".phalanx--base"), { width: width });
      gsap.set(thumbEl.value.querySelector(".phalanx--tip"), { width: width });
    }

    return tl;
  };

  const slideOutOfScreen = () => {
    if (handEl.value) {
      return gsap.to(handEl.value, {
        x: -9999,
        duration: 2, // Ajusté pour être visible, 15 était très lent
        ease: "power2.in",
      });
    }
  };

  const foldFinger = (
    fingerIndex: number,
    fold: boolean,
    delay: number,
    customFoldedBaseHeight = 20,
  ) => {
    const fingerEl = fingerMap.value.get(fingerIndex);
    if (!fingerEl) return 0;
    const tipEl = fingerEl.querySelector<HTMLElement>(".phalanx--tip");
    const baseEl = fingerEl.querySelector<HTMLElement>(".phalanx--base");
    if (!tipEl || !baseEl) return 0;

    gsap.killTweensOf([fingerEl, tipEl, baseEl]);

    const tl = gsap.timeline({ delay });
    const middleFinger = async () => {
      resetTopFingerRotationZ();
      // 1. On ferme tout d'abord
      await foldFingers(true);
      // 2. Puis on lève spécifiquement le majeur
      await foldFinger(2, false, 0);
    };
    const phalanxBorderRadius = 5;
    const phalanxBorderTopRadius = 10;
    const foldedPhalanxBorderTopRadius = 20;

    const baseHeight = fold
      ? `${customFoldedBaseHeight}px`
      : `${fingerBaseheight(fingerIndex)}px`;

    tl.to(
      tipEl,
      {
        rotationX: fold ? 90 : 0,
        borderRadius: `${phalanxBorderTopRadius}px ${phalanxBorderTopRadius}px ${phalanxBorderRadius}px ${phalanxBorderRadius}px`,
        duration: classicFoldDuration,
        ease: "power2.inOut",
      },
      fold ? 0 : classicFoldDuration * 0.5,
    );

    tl.to(
      baseEl,
      {
        height: baseHeight,
        borderRadius: fold
          ? `${foldedPhalanxBorderTopRadius}px ${foldedPhalanxBorderTopRadius}px 0px 0px`
          : `${phalanxBorderRadius}px ${phalanxBorderRadius}px 0px 0px`,
        duration: classicFoldDuration,
        ease: "power2.inOut",
      },
      fold ? classicFoldDuration * 0.5 : 0,
    );

    return tl; // Retourner la timeline permet de faire : await foldFinger(...)
  };

  const foldTopFingers = (fold: boolean, skippedIndex?: number) => {
    const topFingers = getTopFingers();
    let maxCompletion = 0;

    topFingers.forEach((el, i) => {
      if (i === skippedIndex) return;
      const fingerIndex = i + 1;
      const delay = fold ? 0.32 / (i + 1) : 0.32 / (topFingers.length - i + 1);
      const tl = foldFinger(fingerIndex, fold, delay);
      const completion = tl ? delay + classicFoldDuration * 1.5 : 0;
      maxCompletion = Math.max(maxCompletion, completion);
    });

    return maxCompletion;
  };

  const foldThumb = (fold: boolean) => {
    foldFinger(0, fold, 0, 35);
  };

  const foldFingers = (fold: boolean, skippedTopFingersIndex?: number) => {
    const topFingersDone = foldTopFingers(fold, skippedTopFingersIndex);
    foldThumb(fold);
    return topFingersDone;
  };

  // Animations
  const wave = () => {
    resetTopFingerRotationZ();
    foldTopFingers(false);
    foldThumb(false);
    setThumbRotation(baseThumbRotation.x, baseThumbRotation.z);
    startWaveMotion();
  };

  const no = async () => {
    resetTopFingerRotationZ();

    // On attend que les doigts se plient/déplient
    await Promise.all([
      foldFinger(1, false, 0), // Index se lève
      foldFingers(true, 0), // Les autres se plient
    ]);

    // On lance le balancier seulement quand la pose est prête
    startFingerNo();
  };

  const middleFinger = () => {
    resetTopFingerRotationZ();
    foldFingers(false);
    foldFingers(true, 1);
  };

  const thumbYes = () => {};

  const wipeForm = async () => {
    await morphIntoBar();
    slideOutOfScreen();
  };

  // Launch animations directly from the state
  const stateToAnimationIntent = (state: HandState): void => {
    switch (state) {
      case "idle":
      case "active":
        wave();
        // setBasePose();
        // wipeForm();
        return;
      case "warning":
      case "error":
        no();
        return;
      case "insult":
        middleFinger();
        return;
      case "sending":
        wipeForm();
        return;
      case "success":
        thumbYes();
        return;
    }
  };

  const applyState = (state: HandState) => {
    stopSending();
    stopFingerNo();

    // stop idle (wave motion) when entering any state that is not idle/active
    if (state !== "idle" && state !== "active") {
      stopWaveMotion();
    }

    stateToAnimationIntent(state);
  };

  const mount = async (root: HTMLElement | null) => {
    rootEl.value = root;
    await nextTick();
    if (!rootEl.value) return;
    ctx = gsap.context(() => {
      setBasePose();
      applyState(stateRef.value);
    }, rootEl.value);

    // watch stateRef inside composable
    watch(stateRef, (next) => {
      if (!ctx) return;
      ctx.add(() => applyState(next));
    });
  };

  const destroy = () => {
    ctx?.revert();
    ctx = null;
    idleTween = null;
    sendingTween = null;
    sendingTapTween = null;
    fingerNoDelayTween?.kill();
    fingerNoDelayTween = null;
    fingerNoTween = null;
    fingerMap.value.clear();
  };

  onBeforeUnmount(() => {
    destroy();
  });

  return {
    rootEl,
    handEl,
    thumbEl,
    topFingersEl,
    setTopFingersRef,
    setFingerRef,
    setHandRef,
    setPalmRef,
    mount,
    destroy,
  };
}

export type { FingerData };
