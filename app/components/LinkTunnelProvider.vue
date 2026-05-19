<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import TunnelOverlay from "./TunnelOverlay.vue";

type TunnelPhase = "enter" | "exit";
type TunnelKind = "default" | "internal" | "external";

const active = ref(false);
const phase = ref<TunnelPhase>("enter");
const timerIds = reactive<{
  open: number | null;
  close: number | null;
  reset: number | null;
}>({
  open: null,
  close: null,
  reset: null,
});
const tunnelState = reactive({
  x: 0,
  y: 0,
  kind: "default" as TunnelKind,
});
const lastClick = reactive({ x: 0, y: 0 });
let preopenedWindow: Window | null = null;

function clearTimer(key: keyof typeof timerIds) {
  const timerId = timerIds[key];

  if (timerId !== null) {
    window.clearTimeout(timerId);
    timerIds[key] = null;
  }
}

function clearTimers() {
  clearTimer("open");
  clearTimer("close");
  clearTimer("reset");
}

function getLinkKind(href: string): TunnelKind {
  if (href.startsWith("#")) return "internal";
  if (/^https?:\/\//i.test(href) || href.startsWith("//")) return "external";
  if (href.startsWith("/")) return "internal";
  // Relative paths (no scheme) are internal
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href)) return "internal";
  // Fallback: external
  return "external";
}

function getCurrentTargetPosition(href: string, anchor: HTMLAnchorElement) {
  if (!href.startsWith("#")) {
    const rect = anchor.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  const target = document.querySelector(href) as HTMLElement | null;

  if (!target) {
    const rect = anchor.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  const rect = target.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function getLinkSectionColor(anchor: HTMLAnchorElement) {
  const section = anchor.closest("section") as HTMLElement | null;

  if (!section) {
    return null;
  }

  const dataColor = section.dataset.color ?? null;
  const cssColor = getComputedStyle(section)
    .getPropertyValue("--section-color")
    .trim();

  return (dataColor ?? cssColor) || null;
}

function startTransition(x: number, y: number, kind: TunnelKind) {
  clearTimers();

  tunnelState.x = x;
  tunnelState.y = y;
  lastClick.x = x;
  lastClick.y = y;
  tunnelState.kind = kind;
  phase.value = "enter";
  active.value = true;
}

function replayWithExit(x: number, y: number, kind: TunnelKind) {
  clearTimer("reset");
  clearTimer("close");

  tunnelState.x = x;
  tunnelState.y = y;
  tunnelState.kind = kind;
  phase.value = "exit";
  active.value = true;

  timerIds.reset = window.setTimeout(() => {
    active.value = false;
    timerIds.reset = null;
  }, 700);
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

  const sectionColor = getLinkSectionColor(anchor);
  console.log("Link section color:", sectionColor);

  event.preventDefault();

  const kind = getLinkKind(href);
  const rect = anchor.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  // For external links, open a blank tab immediately to avoid popup blockers.
  if (kind === "external") {
    try {
      preopenedWindow = window.open("", "_blank");
    } catch (e) {
      preopenedWindow = null;
    }
  }

  startTransition(x, y, kind);

  timerIds.open = window.setTimeout(() => {
    if (kind === "internal") {
      if (href.startsWith("#")) {
        const targetElement = document.querySelector(
          href,
        ) as HTMLElement | null;
        targetElement?.scrollIntoView({ behavior: "auto", block: "start" });

        // Wait for layout to settle after scroll, then reveal back to the
        // original click coordinates so the tunnel contracts toward the
        // click point instead of the page center.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            replayWithExit(lastClick.x, lastClick.y, kind);
          });
        });
      } else {
        // preload internal file (same-origin path) and navigate after download
        (async () => {
          try {
            const resp = await fetch(anchor.href, {
              credentials: "same-origin",
            });
            if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            // Navigate to the blob URL (same tab) once download finished.
            window.location.href = url;
          } catch (e) {
            // fallback to normal navigation and unfreeze overlay
            active.value = false;
            window.location.href = anchor.href;
          }
        })();
      }

      return;
    }

    // External link: use preopened window (if available) to avoid popup
    // blockers. Assign its location now and then reverse the overlay.
    const newWin = preopenedWindow ?? window.open("", "_blank");

    if (!newWin) {
      // popup blocked — navigate current window as fallback
      active.value = false;
      window.location.href = anchor.href;
      return;
    }

    try {
      newWin.location.href = anchor.href;
    } catch (e) {
      try {
        newWin.location.assign(anchor.href);
      } catch (e2) {
        // as last resort, navigate current window and unfreeze overlay
        active.value = false;
        window.location.href = anchor.href;
        return;
      }
    }

    // Clear stored preopen reference
    preopenedWindow = null;

    // Reverse overlay to reveal current page once tab opened
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        replayWithExit(lastClick.x, lastClick.y, kind);
      });
    });
  }, 650);
}

onMounted(() => {
  document.addEventListener("click", handleClick, true);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClick, true);
  clearTimers();
});
</script>

<template>
  <slot />
  <TunnelOverlay
    :active="active"
    :phase="phase"
    :kind="tunnelState.kind"
    :x="tunnelState.x"
    :y="tunnelState.y"
  />
</template>
