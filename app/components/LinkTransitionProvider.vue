<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import TunnelOverlay from "./TunnelOverlay.vue";
import SectionColorOverlay from "./SectionColorOverlay.vue";

type TransitionStage = "out" | "in";
type LinkKind = "internal" | "external";

// Timings are hardcoded per-overlay. Keep them in sync with the
// animation durations defined inside `TunnelOverlay.vue` (CSS).
const ENTER_DELAY = 650; // ms before performing navigation for external/internal links

const active = ref(false);
const stage = ref<TransitionStage>("out");
const clickX = ref(
  typeof window !== "undefined" ? Math.round(window.innerWidth / 2) : 0,
);
const clickY = ref(
  typeof window !== "undefined" ? Math.round(window.innerHeight / 2) : 0,
);
const transitionState = reactive({
  currentHtml: "",
  targetHtml: "",
  currentColor: "#000000",
  targetColor: "#000000",
  backgroundColor: "#000000",
  currentWidth: 0,
  currentHeight: 0,
  targetWidth: 0,
  targetHeight: 0,
});
let preopenedWindow: Window | null = null;
let pendingHref: string | null = null;
let pendingKind: LinkKind | null = null;
let pendingSectionTransition = false;
let pendingSectionTarget: HTMLElement | null = null;

function getLinkKind(href: string): LinkKind {
  if (href.startsWith("#")) return "internal";
  if (/^https?:\/\//i.test(href) || href.startsWith("//")) return "external";
  if (href.startsWith("/")) return "internal";
  // Relative paths (no scheme) are internal
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href)) return "internal";
  // Fallback: external
  return "external";
}

function getSectionColor(section: HTMLElement | null) {
  if (!section) {
    return "#000000";
  }

  const dataColor = section.dataset.color?.trim();

  if (dataColor) {
    return dataColor;
  }

  const cssColor = getComputedStyle(section)
    .getPropertyValue("--section-color")
    .trim();

  return cssColor || "#000000";
}

function getSectionHtml(section: HTMLElement | null) {
  return section?.innerHTML ?? "";
}

function getSectionSize(section: HTMLElement | null) {
  if (!section) {
    return { width: 0, height: 0 };
  }

  const rect = section.getBoundingClientRect();
  return {
    width: Math.max(0, Math.round(rect.width)),
    height: Math.max(0, Math.round(rect.height)),
  };
}

function startSectionTransition(
  currentSection: HTMLElement,
  targetSection: HTMLElement,
) {
  transitionState.currentHtml = getSectionHtml(currentSection);
  transitionState.targetHtml = getSectionHtml(targetSection);
  transitionState.currentColor = getSectionColor(currentSection);
  transitionState.targetColor = getSectionColor(targetSection);
  transitionState.backgroundColor = transitionState.currentColor;

  const currentSize = getSectionSize(currentSection);
  const targetSize = getSectionSize(targetSection);

  transitionState.currentWidth = currentSize.width;
  transitionState.currentHeight = currentSize.height;
  transitionState.targetWidth = targetSize.width;
  transitionState.targetHeight = targetSize.height;

  active.value = true;
  stage.value = "out";
  pendingSectionTarget = targetSection;

  // Let the overlay manage the timings. Just set the background color
  // and mark that a section transition is pending.
  pendingSectionTransition = true;

  requestAnimationFrame(() => {
    transitionState.backgroundColor = transitionState.targetColor;
  });
}

function handleClick(event: MouseEvent) {
  if (event.button !== 0) {
    return;
  }

  // record last click coordinates to anchor tunnel animations
  clickX.value = Math.round(event.clientX || Math.round(window.innerWidth / 2));
  clickY.value = Math.round(
    event.clientY || Math.round(window.innerHeight / 2),
  );

  const target = event.target as HTMLElement | null;
  const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;

  if (!anchor) {
    return;
  }

  // If the author explicitly chose `target="_blank"`, do not intercept at all.
  if (anchor.target === "_blank") {
    return;
  }

  if (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    anchor.target === "_blank" ||
    anchor.hasAttribute("download")
  ) {
    return;
  }

  const href = anchor.getAttribute("href");

  if (!href || href.startsWith("javascript:")) {
    return;
  }

  const currentSection = anchor.closest("section") as HTMLElement | null;
  const targetSection = href.startsWith("#")
    ? (document.querySelector(href) as HTMLElement | null)
    : null;

  if (currentSection && targetSection) {
    event.preventDefault();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        startSectionTransition(currentSection, targetSection);
      });
    });

    return;
  }

  const kind = getLinkKind(href);

  // For external links, open a blank tab immediately to avoid popup blockers.
  if (kind === "external") {
    try {
      preopenedWindow = window.open("", "_blank");
    } catch (e) {
      preopenedWindow = null;
    }
  }

  // We will perform navigation after the overlay reports its "entered" state.
  event.preventDefault();

  pendingHref = anchor.href;
  pendingKind = kind;

  active.value = true;
  stage.value = "out";
}

async function onOverlayEntered() {
  // Called when overlay finished its enter animation.
  if (pendingSectionTransition) {
    if (pendingSectionTarget) {
      pendingSectionTarget.scrollIntoView({ behavior: "auto", block: "start" });
    }

    // switch to 'in' so overlay plays reverse; overlay will emit 'exited' after
    stage.value = "in";
    return;
  }

  if (!pendingHref || !pendingKind) return;

  const hrefToNavigate = pendingHref;
  const kindToNavigate = pendingKind;

  // clear pending state early
  pendingHref = null;
  pendingKind = null;

  if (kindToNavigate === "internal") {
    if (!hrefToNavigate.startsWith("#")) {
      try {
        const resp = await fetch(hrefToNavigate, {
          credentials: "same-origin",
        });
        if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        window.location.href = url;
      } catch (e) {
        // fallback
        window.location.href = hrefToNavigate;
      }
    } else {
      window.location.href = hrefToNavigate;
    }

    stage.value = "in";
    return;
  }

  // external
  const newWin = preopenedWindow ?? window.open("", "_blank");
  if (!newWin) {
    window.location.href = hrefToNavigate;
    stage.value = "in";
    preopenedWindow = null;
    return;
  }

  try {
    newWin.location.href = hrefToNavigate;
  } catch (e) {
    try {
      newWin.location.assign(hrefToNavigate);
    } catch (e2) {
      window.location.href = hrefToNavigate;
    }
  }

  preopenedWindow = null;
  stage.value = "in";
}

function onOverlayExited() {
  // overlay finished exit animation — clear active state
  active.value = false;
  pendingSectionTransition = false;
  pendingSectionTarget = null;
}

onMounted(() => {
  document.addEventListener("click", handleClick, true);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClick, true);
});
</script>

<template>
  <slot />
  <!-- Choisir manuellement : laissez un seul overlay actif et commentez l'autre. -->
  <!-- <SectionColorOverlay
    v-if="pendingSectionTransition"
    :active="active"
    :stage="stage"
    :current-html="transitionState.currentHtml"
    :target-html="transitionState.targetHtml"
    :current-color="transitionState.currentColor"
    :target-color="transitionState.targetColor"
    :background-color="transitionState.backgroundColor"
    :current-width="transitionState.currentWidth"
    :current-height="transitionState.currentHeight"
    :target-width="transitionState.targetWidth"
    :target-height="transitionState.targetHeight"
    @entered="onOverlayEntered"
    @exited="onOverlayExited"
  /> -->

  <TunnelOverlay
    :active="active"
    :phase="stage === 'out' ? 'enter' : 'exit'"
    :x="clickX"
    :y="clickY"
    @entered="onOverlayEntered"
    @exited="onOverlayExited"
  />
</template>
