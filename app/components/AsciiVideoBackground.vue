<script setup lang="ts">
interface Props {
  src: string;
  mode?: "ascii" | "dots";
  color?: string;
  cols?: number;
  invert?: boolean;
  opacity?: number;
  /** Luminance mini (0-1) pour qu'un point soit dessiné, en mode dots */
  threshold?: number;
  /** Rayon de base d'un point au-dessus du threshold, en fraction de la largeur de cellule */
  dotSize?: number;
  /** Rayon des points en dessous du threshold (grille par défaut, jamais vide), en fraction de la largeur de cellule */
  minDotSize?: number;
  /** Distance (px CSS) au-delà de laquelle le pointeur n'a plus d'effet */
  pointerRadius?: number;
  /** Multiplicateur du rayon quand le pointeur est exactement sur le point */
  pointerStrength?: number;
}

const props = withDefaults(defineProps<Props>(), {
  mode: "ascii",
  color: "#7dd3fc",
  cols: 120,
  invert: false,
  opacity: 1,
  threshold: 0.3,
  dotSize: 0.2,
  minDotSize: 0.08,
  pointerRadius: 220,
  pointerStrength: 2.5,
});

const videoRef = ref<HTMLVideoElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

const RAMP = " .:-=+*#%@";

let ctx: CanvasRenderingContext2D | null = null;
let sample: HTMLCanvasElement | null = null;
let sctx: CanvasRenderingContext2D | null = null;
let rafId: number | null = null;
let dpr = 1;
let pointerX = -9999;
let pointerY = -9999;

function resize() {
  if (!canvasRef.value) return;
  dpr = window.devicePixelRatio || 1;
  canvasRef.value.width = window.innerWidth * dpr;
  canvasRef.value.height = window.innerHeight * dpr;
}

function handlePointerMove(e: PointerEvent) {
  pointerX = e.clientX * dpr;
  pointerY = e.clientY * dpr;
}

function render() {
  const video = videoRef.value;
  const canvas = canvasRef.value;

  if (
    video &&
    canvas &&
    ctx &&
    sctx &&
    sample &&
    video.readyState >= 2 &&
    !video.paused
  ) {
    const rows = Math.max(
      1,
      Math.round(props.cols * (video.videoHeight / video.videoWidth) * 0.55),
    );
    sample.width = props.cols;
    sample.height = rows;
    sctx.drawImage(video, 0, 0, props.cols, rows);
    const { data } = sctx.getImageData(0, 0, props.cols, rows);

    const cellW = canvas.width / props.cols;
    const cellH = canvas.height / rows;
    const baseRadius = cellW * props.dotSize;
    const minRadius = cellW * props.minDotSize;
    const pointerRadiusPx = props.pointerRadius * dpr;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = props.color;

    if (props.mode === "ascii") {
      ctx.font = `${cellH}px monospace`;
      ctx.textBaseline = "top";
    }

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < props.cols; x++) {
        const i = (y * props.cols + x) * 4;
        let lum =
          (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
        if (props.invert) lum = 1 - lum;

        if (props.mode === "ascii") {
          const char = RAMP[Math.floor(lum * (RAMP.length - 1))];
          if (char !== " ") ctx.fillText(char, x * cellW, y * cellH);
        } else {
          const cx = x * cellW + cellW / 2;
          const cy = y * cellH + cellH / 2;
          const dist = Math.hypot(cx - pointerX, cy - pointerY);
          const influence = Math.max(0, 1 - dist / pointerRadiusPx);
          const base = lum > props.threshold ? baseRadius : minRadius;
          const radius = base * (1 + influence * (props.pointerStrength - 1));

          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  rafId = requestAnimationFrame(render);
}

onMounted(() => {
  if (!canvasRef.value || !videoRef.value) return;

  ctx = canvasRef.value.getContext("2d");
  sample = document.createElement("canvas");
  sctx = sample.getContext("2d", { willReadFrequently: true });

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", handlePointerMove);

  videoRef.value.addEventListener("loadedmetadata", () => {
    videoRef.value?.play().catch(() => {});
  });

  rafId = requestAnimationFrame(render);
});

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId);
  window.removeEventListener("resize", resize);
  window.removeEventListener("pointermove", handlePointerMove);
});
</script>

<template>
  <div class="ascii-bg" :style="{ opacity: props.opacity }">
    <video
      ref="videoRef"
      :src="props.src"
      muted
      loop
      autoplay
      playsinline
      class="ascii-bg__video"
    />
    <canvas ref="canvasRef" class="ascii-bg__canvas" />
  </div>
</template>

<style scoped lang="scss">
.ascii-bg {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;

  &__video {
    display: none;
  }

  &__canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
}
</style>
