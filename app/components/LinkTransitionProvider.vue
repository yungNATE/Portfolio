<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import SectionColorOverlay from "./SectionColorOverlay.vue";
import { getSectionColor } from "~/utils/getSectionColor";
import { PAGE_TRANSITION_START_EVENT } from "~/utils/modalEvents";

// Filet de sécurité si "page:finish" ne se déclenche jamais (page d'erreur…).
const PAGE_FINISH_TIMEOUT_MS = 3000;

const router = useRouter();
const nuxtApp = useNuxtApp();

type TransitionStage = "out" | "colorTransition" | "in";
type LinkKind = "internal" | "external";

const active = ref(false);
const stage = ref<TransitionStage>("out");
const transitionState = reactive({
  currentColor: "#000000",
  targetColor: "#000000",
});
let pendingHref: string | null = null;
let pendingRoute: string | null = null;

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
  pendingRoute = null;
}

/**
 * Changement de page : l'overlay se déploie avec la couleur de la section
 * cliquée, la route change dessous, puis la couleur cible est lue dans le DOM
 * de la nouvelle page (voir resolveTargetColor).
 */
function startPageTransition(currentSection: HTMLElement | null, url: URL) {
  transitionState.currentColor = getSectionColor(currentSection);
  transitionState.targetColor = transitionState.currentColor;

  active.value = true;
  stage.value = "out";
  pendingHref = null;
  pendingRoute = url.pathname + url.search + url.hash;

  // Les modales (top layer) se ferment pendant que l'overlay se déploie.
  window.dispatchEvent(new Event(PAGE_TRANSITION_START_EVENT));
}

// Section visée par l'ancre, sinon la première section de la page. Sans
// section colorée (autre page), getSectionColor renvoie --color-dark.
function resolveTargetColor() {
  const { hash } = window.location;
  const target = hash
    ? document.querySelector<HTMLElement>(hash)
    : document.querySelector<HTMLElement>("section");

  return getSectionColor(target);
}

async function navigateUnderOverlay(to: string) {
  let unhook: (() => void) | undefined;
  const pageFinished = new Promise<void>((resolve) => {
    unhook = nuxtApp.hook("page:finish", () => resolve());
    window.setTimeout(resolve, PAGE_FINISH_TIMEOUT_MS);
  });

  const failure = await router.push(to).catch((error) => error);
  if (!failure) {
    await pageFinished;
  }
  unhook?.();
  await nextTick();
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

  // Lien vers une autre page du site (ex. modale → étude de cas, retour
  // vers /#work) : capture avant NuxtLink, qui ne navigue plus.
  const url = new URL(anchor.href, window.location.href);
  if (
    url.origin === window.location.origin &&
    url.pathname !== window.location.pathname
  ) {
    event.preventDefault();

    if (active.value) {
      return;
    }

    requestAnimationFrame(() => {
      startPageTransition(currentSection, url);
    });
  }
}

async function onOverlayEntered() {
  if (pendingRoute) {
    const to = pendingRoute;
    pendingRoute = null;

    await navigateUnderOverlay(to);
    transitionState.targetColor = resolveTargetColor();
    stage.value = "colorTransition";
    return;
  }

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
