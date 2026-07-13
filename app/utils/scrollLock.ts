export type ScrollLockOptions = {
  id?: string;
};

const locks = new Set<symbol>();
let savedScrollY = 0;

function applyCssLock() {
  if (typeof document === "undefined") return;
  savedScrollY = window.scrollY;
  document.body.style.position = "fixed";
  document.body.style.top = `-${savedScrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.overflow = "hidden";
}

function releaseCssLock() {
  if (typeof document === "undefined") return;
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.overflow = "";
  window.scrollTo(0, savedScrollY);
}

export function lockScroll(opts: ScrollLockOptions = {}): () => void {
  const token = Symbol(opts.id ?? "scroll-lock");

  if (locks.size === 0) {
    applyCssLock();
    getActiveHorizontalScroll()?.pause();
  }
  locks.add(token);

  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks.delete(token);
    if (locks.size === 0) {
      releaseCssLock();
      getActiveHorizontalScroll()?.resume();
    }
  };
}

export function isScrollLocked(): boolean {
  return locks.size > 0;
}

export function forceUnlockScroll(): void {
  locks.clear();
  releaseCssLock();
  getActiveHorizontalScroll()?.resume();
}

export default lockScroll;
