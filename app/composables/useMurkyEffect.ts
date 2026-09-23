import { onBeforeUnmount, onMounted, ref, type Ref } from "vue";

const MAX_DIST = 420;
const REST = { r: 38, g: 26, b: 15 };
const HOVER = { r: 2, g: 1, b: 0 };
const EASE = 0.09;
// En dessous, la variation de displacement est visuellement imperceptible :
// pas la peine de recomposer le filtre pour ça.
const CONVERGED_EPSILON = 0.05;

type DisplacementRefs = {
  r: Ref<SVGFEDisplacementMapElement | null>;
  g: Ref<SVGFEDisplacementMapElement | null>;
  b: Ref<SVGFEDisplacementMapElement | null>;
};

type MurkyCardState = {
  rootEl: Ref<HTMLElement | null>;
  displacementRefs: DisplacementRefs;
  isVisible: Ref<boolean>;
  current: {
    r: number;
    g: number;
    b: number;
  };
};

const cards = new Set<MurkyCardState>();
const reducedMotion = ref(false);

let pointerX = 0;
let pointerY = 0;
let hasPointer = false;
let rafId: number | null = null;
let listenersBound = false;
let mediaQuery: MediaQueryList | null = null;

function distToRect(mx: number, my: number, rect: DOMRect) {
  const dx = Math.max(rect.left - mx, 0, mx - rect.right);
  const dy = Math.max(rect.top - my, 0, my - rect.bottom);

  return Math.hypot(dx, dy);
}

function updateDisplacement(
  element: SVGFEDisplacementMapElement | null,
  value: number,
) {
  if (!element) {
    return;
  }

  element.setAttribute("scale", value.toFixed(2));
}

function tick() {
  rafId = null;

  cards.forEach((card) => {
    if (!card.isVisible.value) {
      // Hors viewport : ni calcul de distance, ni écriture DOM. Le
      // getBoundingClientRect() ci-dessous force un recalcul de layout et
      // chaque setAttribute plus bas recompose le filtre SVG — les deux
      // coûteux et inutiles pour une carte que personne ne voit. Elle
      // reste figée sur sa dernière valeur jusqu'à réapparition.
      return;
    }

    const root = card.rootEl.value;

    if (!root) {
      return;
    }

    const rect = root.getBoundingClientRect();
    const distance = hasPointer
      ? distToRect(pointerX, pointerY, rect)
      : MAX_DIST;
    const t = Math.min(Math.max(distance / MAX_DIST, 0), 1);

    const targetR = HOVER.r + (REST.r - HOVER.r) * t;
    const targetG = HOVER.g + (REST.g - HOVER.g) * t;
    const targetB = HOVER.b + (REST.b - HOVER.b) * t;

    const deltaR = targetR - card.current.r;
    const deltaG = targetG - card.current.g;
    const deltaB = targetB - card.current.b;

    // Carte déjà convergée vers sa cible : on garde le calcul de distance
    // ci-dessus pour détecter un futur rapprochement du curseur, mais on
    // n'écrit plus l'attribut — c'est cette écriture qui recompose le
    // filtre à chaque frame, pas le calcul en lui-même.
    if (
      Math.abs(deltaR) < CONVERGED_EPSILON &&
      Math.abs(deltaG) < CONVERGED_EPSILON &&
      Math.abs(deltaB) < CONVERGED_EPSILON
    ) {
      return;
    }

    card.current.r += deltaR * EASE;
    card.current.g += deltaG * EASE;
    card.current.b += deltaB * EASE;

    updateDisplacement(card.displacementRefs.r.value, card.current.r);
    updateDisplacement(card.displacementRefs.g.value, card.current.g);
    updateDisplacement(card.displacementRefs.b.value, card.current.b);
  });

  if (cards.size > 0) {
    rafId = window.requestAnimationFrame(tick);
  }
}

function ensureLoop() {
  if (rafId === null && cards.size > 0) {
    rafId = window.requestAnimationFrame(tick);
  }
}

function handlePointerMove(event: MouseEvent) {
  pointerX = event.clientX;
  pointerY = event.clientY;
  hasPointer = true;
  ensureLoop();
}

function syncReducedMotion() {
  reducedMotion.value = mediaQuery?.matches ?? false;
}

function bindSharedListeners() {
  if (listenersBound || typeof window === "undefined") {
    return;
  }

  listenersBound = true;
  window.addEventListener("mousemove", handlePointerMove, { passive: true });

  mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  syncReducedMotion();

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener("change", syncReducedMotion);
  } else {
    mediaQuery.addListener(syncReducedMotion);
  }
}

function unbindSharedListeners() {
  if (!listenersBound || typeof window === "undefined") {
    return;
  }

  listenersBound = false;
  window.removeEventListener("mousemove", handlePointerMove);

  if (mediaQuery) {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener("change", syncReducedMotion);
    } else {
      mediaQuery.removeListener(syncReducedMotion);
    }
  }

  mediaQuery = null;
}

function stopLoopIfIdle() {
  if (cards.size === 0 && rafId !== null) {
    window.cancelAnimationFrame(rafId);
    rafId = null;
  }
}

export function useMurkyEffect(
  rootEl: Ref<HTMLElement | null>,
  displacementRefs: DisplacementRefs,
  isVisible: Ref<boolean>,
) {
  const state: MurkyCardState = {
    rootEl,
    displacementRefs,
    isVisible,
    current: {
      r: REST.r,
      g: REST.g,
      b: REST.b,
    },
  };

  onMounted(() => {
    cards.add(state);
    bindSharedListeners();
    ensureLoop();
  });

  onBeforeUnmount(() => {
    cards.delete(state);
    stopLoopIfIdle();

    if (cards.size === 0) {
      unbindSharedListeners();
      hasPointer = false;
    }
  });

  return {
    reducedMotion,
  };
}
