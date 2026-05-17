import { onBeforeUnmount, onMounted, ref } from "vue";

export type ScreenMode = "vertical" | "horizontal";

export function getScreenRatio(width?: number, height?: number) {
  const resolvedWidth =
    width ?? (typeof window !== "undefined" ? window.innerWidth : 0);
  const resolvedHeight =
    height ?? (typeof window !== "undefined" ? window.innerHeight : 0);

  if (!resolvedHeight) {
    return 1;
  }

  return resolvedWidth / resolvedHeight;
}

export function getScreenMode(ratio = getScreenRatio()): ScreenMode {
  return ratio <= 1 ? "vertical" : "horizontal";
}

export function useScreenInfo() {
  const screenRatio = ref(1);
  const screenMode = ref<ScreenMode>("vertical");

  const updateScreenInfo = () => {
    const ratio = getScreenRatio();
    screenRatio.value = ratio;
    screenMode.value = getScreenMode(ratio);
  };

  onMounted(() => {
    updateScreenInfo();
    window.addEventListener("resize", updateScreenInfo);
    window.addEventListener("orientationchange", updateScreenInfo);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", updateScreenInfo);
    window.removeEventListener("orientationchange", updateScreenInfo);
  });

  return {
    screenRatio,
    screenMode,
    updateScreenInfo,
  };
}
