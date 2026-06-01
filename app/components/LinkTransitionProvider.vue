<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import SectionColorOverlay from "./SectionColorOverlay.vue";
import { getSectionColor } from "~/utils/getSectionColor";

type TransitionStage = "out" | "colorTransition" | "in";
type LinkKind = "internal" | "external";

const active = ref(false);
const stage = ref<TransitionStage>("out");
const transitionState = reactive({
  currentColor: "#000000",
  targetColor: "#000000",
});
let pendingHref: string | null = null;

function getLinkKind(href: string): LinkKind {
  if (href.startsWith("#")) return "internal";
  if (/^https?:\/\//i.test(href) || href.startsWith("//")) return "external";
  if (href.startsWith("/")) return "internal";
  // Relative paths (no scheme) are internal
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href)) return "internal";
  // Fallback: external
  return "external";
}

function startSectionTransition(
  currentSection: HTMLElement,
  targetSection: HTMLElement,
  href: string,
) {
  transitionState.currentColor = getSectionColor(currentSection);
  transitionState.targetColor = getSectionColor(targetSection);

  active.value = true;
  stage.value = "out";
  pendingHref = href;
}

function handleClick(event: MouseEvent) {
  if (event.button !== 0) {
    return;
  }

  const target = event.target as HTMLElement | null;
  const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;

  if (!anchor) {
    return;
  }

  const href = anchor.getAttribute("href");

  if (!href) {
    return;
  }
  const kind = getLinkKind(href);
  if (
    anchor.target === "_blank" ||
    kind === "external" ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    anchor.hasAttribute("download")
  ) {
    return;
  }

  const currentSection = anchor.closest("section") as HTMLElement | null;
  const targetSection = href.startsWith("#")
    ? (document.querySelector(href) as HTMLElement | null)
    : null;

  if (currentSection && targetSection) {
    event.preventDefault();

    requestAnimationFrame(() => {
      startSectionTransition(currentSection, targetSection, anchor.href);
    });

    return;
  }
}

function onOverlayEntered() {
  stage.value = "colorTransition";
  window.location.href = pendingHref || "";
}

function onOverlayColorTransitioned() {
  stage.value = "in";
}

function onOverlayExited() {
  stage.value = "out";
  active.value = false;
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
  <SectionColorOverlay
    :out-duration-ms="1000"
    :color-duration-ms="1000"
    :in-duration-ms="2000"
    :active="active"
    :stage="stage"
    :current-color="transitionState.currentColor"
    :target-color="transitionState.targetColor"
    @entered="onOverlayEntered"
    @color-transitioned="onOverlayColorTransitioned"
    @exited="onOverlayExited"
  />
</template>
