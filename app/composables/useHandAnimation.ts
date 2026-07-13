import gsap from "gsap";
import { GSDevTools } from "gsap/GSDevTools";
import { nextTick, ref, type Ref, watch, onBeforeUnmount } from "vue";
// import { ssrGetDirectiveProps } from "vue/server-renderer"; // Cette ligne est probablement inutile, vous pouvez la supprimer.

// Enregistrez le plugin GSDevTools une seule fois, au niveau du module.
// Protection SSR essentielle pour éviter les erreurs "createElementNS".
if (typeof window !== "undefined") {
  gsap.registerPlugin(GSDevTools);
}

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
  const formEl = ref<HTMLElement | null>(null);
  const handWrapperEl = ref<HTMLElement | null>(null);
  const contactLayoutEl = ref<HTMLElement | null>(null);
  const successRevealEl = ref<HTMLElement | null>(null);
  const successHandEl = ref<HTMLElement | null>(null);
  const successTextEl = ref<HTMLElement | null>(null);

  let ctx: gsap.Context | null = null;
  let gsDevToolsInstance: GSDevTools | null = null;
  let idleTween: gsap.core.Tween | null = null;
  let sendingTween: gsap.core.Tween | null = null;
  let sendingTapTween: gsap.core.Tween | null = null;
  let fingerNoDelayTween: gsap.core.Tween | null = null;
  let fingerNoTween: gsap.core.Tween | gsap.core.Timeline | null = null;
  let successRevealTween: gsap.core.Timeline | null = null;
  let successWaveTween: gsap.core.Tween | null = null;
  let successRevealQueued = false;
  let wipeMasterTimeline: gsap.core.Timeline | null = null;

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

  const setFormRef = (el: HTMLElement | null) => {
    formEl.value = el;
  };

  const setHandWrapperRef = (el: HTMLElement | null) => {
    handWrapperEl.value = el;
  };

  const setContactLayoutRef = (el: HTMLElement | null) => {
    contactLayoutEl.value = el;
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

  const playSuccessReveal = () => {
    const tl = gsap.timeline({ id: "SuccessRevealTimeline" });

    successRevealQueued = false;
    successRevealTween?.kill();
    successWaveTween?.kill();

    gsap.set(successRevealEl.value, {
      opacity: 1,
    });
    gsap.set(successHandEl.value, {
      x: 0,
      opacity: 0,
      scale: 0.1,
      rotationZ: 0,
      transformOrigin: "bottom center",
    });
    gsap.set(successTextEl.value, {
      opacity: 0,
      scale: 0.1,
      x: 0,
      clipPath: "polygon(0 0, 50% 0, 50% 100%, 0% 100%)",
      transformOrigin: "left center",
    });

    tl.to(
      [successHandEl.value, successTextEl.value],
      {
        opacity: 1,
        scale: 1,
        duration: 0.42,
        ease: "back.out(1.7)",
      },
      0,
    );
    const offset = 80;
    tl.to(
      successTextEl.value,
      {
        x: -offset,
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 0% 100%)",
        duration: 0.28,
        ease: "power2.out",
      },
      ">0.04",
    );
    tl.to(
      successHandEl.value,
      {
        x: offset,
        duration: 0.28,
        ease: "power2.out",
      },
      "<",
    );
    tl.to(
      successHandEl.value,
      {
        rotationZ: 8,
        duration: 0.55,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      },
      ">-0.02",
    );

    return tl;
  };

  const morphIntoBar = () => {
    const width = 18;
    const getBarHeight = () => {
      const measuredHeight =
        handWrapperEl.value?.getBoundingClientRect().height ??
        contactLayoutEl.value?.getBoundingClientRect().height ??
        rootEl.value?.parentElement?.getBoundingClientRect().height ??
        rootEl.value?.getBoundingClientRect().height ??
        0;

      return `${Math.ceil(measuredHeight)}px`;
    };

    const tl = gsap.timeline({
      id: "MorphIntoBarTimeline",
      defaults: { duration: 0.4, ease: "power2.inOut" },
    });

    // Morph fingers
    if (topFingersEl.value) {
      tl.to(topFingersEl.value, { width: 0 }, 0);
      const topFingers = getTopFingers();
      topFingers.forEach((el) => {
        tl.to(el.querySelector(".phalanx--base"), { borderRadius: 0 }, 0);
        tl.to(el.querySelector(".phalanx--tip"), { borderRadius: 0 }, 0);
      });
    }

    // morph hand
    if (palmEl.value) {
      tl.to(
        palmEl.value,
        {
          width: width,
          borderRadius: 0,
          height: getBarHeight(),
        },
        0,
      );
    }

    if (rootEl.value) {
      tl.to(
        rootEl.value,
        {
          height: getBarHeight(),
        },
        0,
      );
    }
    if (handEl.value) {
      tl.to(
        handEl.value,
        {
          height: getBarHeight(),
        },
        0,
      );
    }

    // retract thumb - directement dans la timeline
    if (thumbEl.value) {
      tl.to(
        thumbEl.value,
        {
          rotationX: 0,
          rotationZ: 0,
          duration: 0.4,
          right: 0,
        },
        0,
      );
      tl.to(
        thumbEl.value.querySelector(".phalanx--base"),
        {
          width: width,
          borderRadius: 0,
        },
        0,
      );
      tl.to(
        thumbEl.value.querySelector(".phalanx--tip"),
        {
          width: width,
          borderRadius: 0,
        },
        0,
      );
    }

    return tl;
  };

  const SPEED = 1000; // px/s

  const closeForm = () => {
    const tl = gsap.timeline({ id: "CloseFormTimeline" });
    if (formEl.value) {
      const contact = formEl.value.closest(".contact");
      if (contact) {
        const contactRect = contact.getBoundingClientRect();
        if (!contactRect) return tl;
        tl.set(contact, { width: contactRect.width });
      }

      const formWrapper = formEl.value.closest(".formWrapper");
      if (formWrapper) {
        tl.set(formEl.value, {
          clipPath: "inset(0 0% 0 0)",
        });

        tl.to(formEl.value, {
          clipPath: "inset(0 100% 0 0)",
          duration: () =>
            (formEl.value?.getBoundingClientRect().width || 0) / SPEED,
          ease: "none",
        });
        tl.set(formEl.value.closest(".contactLayout"), {
          flexWrap: "nowrap",
        });
      }
    }
    return tl;
  };

  const moveBar = () => {
    const tl = gsap.timeline({ id: "MoveBarTimeline" });

    if (handEl.value) {
      const distTest = 790;
      tl.to(handEl.value, {
        x: () => {
          const handDistanceLeft =
            handEl.value?.getBoundingClientRect().left || 0;

          return -1 * handDistanceLeft;
        },
        duration: () => {
          const handDistanceLeft =
            handEl.value?.getBoundingClientRect().left || 0;

          return (handDistanceLeft / SPEED) * 1.0;
        },
        ease: "none",
      });
      tl.set(
        handEl.value,
        {
          opacity: 0,
        },
        ">",
      );
    }

    return tl;
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

    const phalanxBorderRadius = 5;
    const phalanxBorderTopRadius = 10;
    const foldedPhalanxBorderTopRadius = 20;

    const baseHeight = fold
      ? `${customFoldedBaseHeight}px`
      : `${fingerBaseheight(fingerIndex)}px`;

    const tl = gsap.timeline({ delay }); // La timeline pour cette opération de pliage de doigt
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
    const tl = foldFinger(0, fold, 0, 35);
    return tl; // Retourne la timeline du pliage du pouce
  };

  const foldFingers = (fold: boolean, skippedTopFingersIndex?: number) => {
    // Collectez les timelines de pliage pour les topFingers et le pouce
    const topFingersCompletion = foldTopFingers(fold, skippedTopFingersIndex);
    const thumbTl = foldThumb(fold);

    // Retournez la completion la plus longue pour les topFingers
    // Si vous aviez une master timeline ici, ce serait plus simple à gérer
    return topFingersCompletion;
  };

  // Animations
  const wave = () => {
    resetTopFingerRotationZ();
    foldTopFingers(false);
    foldThumb(false);
    // setThumbRotation(baseThumbRotation.x, baseThumbRotation.z); // Ceci crée un tween global
    // Mieux vaut utiliser gsap.to directement ou l'ajouter à une timeline.
    if (thumbEl.value) {
      gsap.to(thumbEl.value, {
        rotationX: baseThumbRotation.x,
        rotationZ: baseThumbRotation.z,
        duration: fingerRotateDuration,
        ease: "power2.out",
        overwrite: "auto",
      });
    }
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

  const thumbYes = () => {
    successRevealQueued = true;
    if (wipeMasterTimeline) {
      return;
    }

    playSuccessReveal();
  };

  const wipeForm = () => {
    if (ctx) {
      lockScroll();

      ctx.add(() => {
        const masterWipeTl = gsap.timeline({ id: "WipeFormMasterTimeline" });
        wipeMasterTimeline = masterWipeTl;

        const morphTl = morphIntoBar();
        const slideTl = moveBar();
        const closeFormTl = closeForm();
        const revealTl = playSuccessReveal();

        const gap =
          (handEl.value?.getBoundingClientRect().left || 0) -
          (formEl.value?.getBoundingClientRect().right || 0);
        const headStart = Math.max(gap, 0) / SPEED;

        masterWipeTl
          .add(morphTl)
          .add(slideTl)
          .add(closeFormTl, `<+=${headStart}`)
          .add(revealTl);

        if (typeof window !== "undefined" && gsDevToolsInstance) {
          gsDevToolsInstance.kill();
          gsDevToolsInstance = GSDevTools.create({ animation: masterWipeTl });
        }
      });
    } else {
      morphIntoBar().then(() => moveBar());
    }
  };

  // Launch animations directly from the state
  const stateToAnimationIntent = (state: HandState): void => {
    switch (state) {
      case "idle":
      case "active":
        wave();
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

    if (typeof window !== "undefined") {
      ctx = gsap.context(() => {
        // gsDevToolsInstance = GSDevTools.create(); // debug
        setBasePose();
        applyState(stateRef.value);
      }, rootEl.value);

      // watch stateRef inside composable
      watch(stateRef, (next) => {
        if (!ctx) return;
        ctx.add(() => applyState(next));
      });
    }
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
    successRevealTween?.kill();
    successRevealTween = null;
    successWaveTween?.kill();
    successWaveTween = null;
    successRevealQueued = false;
    wipeMasterTimeline = null;
    fingerMap.value.clear();

    if (gsDevToolsInstance) {
      gsDevToolsInstance.kill();
      gsDevToolsInstance = null;
    }
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
    setFormRef,
    setHandWrapperRef,
    setContactLayoutRef,
    successRevealEl,
    successHandEl,
    successTextEl,
    setSuccessRevealRef: (el: HTMLElement | null) => {
      successRevealEl.value = el;
    },
    setSuccessHandRef: (el: HTMLElement | null) => {
      successHandEl.value = el;
    },
    setSuccessTextRef: (el: HTMLElement | null) => {
      successTextEl.value = el;
    },
    mount,
    destroy,
  };
}

export type { FingerData };
