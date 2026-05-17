import gsap from "gsap";

import { getScreenRatio } from "./screen";

export type HorizontalScrollOptions = {
  duration?: number;
  ease?: string;
  speedMultiplier?: number;
};

/**
 * Map vertical wheel events to horizontal scroll on the provided element.
 * Returns a disposer function to remove the listener and stop GSAP tweens.
 */
export function mapVerticalToHorizontalScroll(
  el: HTMLElement,
  opts: HorizontalScrollOptions = {},
) {
  const { duration = 0.8, ease = "power2.out", speedMultiplier = 1 } = opts;

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();

    const maxScroll = el.scrollWidth - el.clientWidth;
    const currentScroll = el.scrollLeft;

    const screenRatio = getScreenRatio();
    const speedRatioFactor = Math.min(Math.max(1, screenRatio), 2);

    const delta = e.deltaY * speedMultiplier * speedRatioFactor;
    const newScroll = Math.max(0, Math.min(currentScroll + delta, maxScroll));

    gsap.to(el, {
      scrollLeft: newScroll,
      duration,
      ease,
    });
  };

  el.addEventListener("wheel", onWheel, { passive: false });

  return () => {
    el.removeEventListener("wheel", onWheel);
    gsap.killTweensOf(el);
  };
}

export default mapVerticalToHorizontalScroll;
