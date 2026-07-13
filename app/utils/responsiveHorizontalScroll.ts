export type ResponsiveOptions = {
  breakpointRatio?: number;
  portraitClass?: string;
  mapOptions?: Parameters<typeof mapVerticalToHorizontalScroll>[1];
};

export type ResponsiveHorizontalScrollHandle = {
  dispose: () => void;
  pause: () => void;
  resume: () => void;
};

let activeHandle: ResponsiveHorizontalScrollHandle | null = null;

/** Récupère l'instance actuellement initialisée (null si aucune). */
export function getActiveHorizontalScroll(): ResponsiveHorizontalScrollHandle | null {
  return activeHandle;
}

export function initResponsiveHorizontalScroll(
  el: HTMLElement,
  opts: ResponsiveOptions = {},
): ResponsiveHorizontalScrollHandle {
  const {
    breakpointRatio = 1,
    portraitClass = "is-portrait",
    mapOptions = {},
  } = opts;

  let disposeMap: (() => void) | null = null;
  let paused = false;

  const isLandscape = () => getScreenRatio() >= breakpointRatio;

  function update() {
    if (paused) return;

    if (getScreenMode() === "horizontal" && isLandscape()) {
      el.classList.remove(portraitClass);
      if (!disposeMap)
        disposeMap = mapVerticalToHorizontalScroll(el, mapOptions);
    } else {
      el.classList.add(portraitClass);
      if (disposeMap) {
        disposeMap();
        disposeMap = null;
      }
    }
  }

  update();

  const onResize = () => update();
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);

  const handle: ResponsiveHorizontalScrollHandle = {
    dispose: () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      if (disposeMap) {
        disposeMap();
        disposeMap = null;
      }
      if (activeHandle === handle) activeHandle = null;
    },
    pause: () => {
      paused = true;
      if (disposeMap) {
        disposeMap();
        disposeMap = null;
      }
    },
    resume: () => {
      paused = false;
      update(); // ré-évalue l'orientation actuelle, recrée le mapping si toujours pertinent
    },
  };

  activeHandle = handle;
  return handle;
}

export default initResponsiveHorizontalScroll;
