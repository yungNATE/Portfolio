<template>
  <canvas ref="canvasRef" class="relief-background" aria-hidden="true" />
</template>

<script lang="ts">
// Bloc "normal" (pas setup) : partagé par toutes les instances. Un seul
// listener pointermove pour toutes les sections, comme dans
// PointerGradientSection.
let pointerX = -1;
let pointerY = -1;
let pointerListenerAttached = false;

function ensurePointerListener() {
  if (pointerListenerAttached || typeof window === "undefined") return;
  pointerListenerAttached = true;
  window.addEventListener(
    "pointermove",
    (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
    },
    { passive: true },
  );
}

const VERTEX_SHADER = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0., 1.); }`;

// Normal map procédurale : une hauteur en bruit fractal dont chaque octave
// dérive dans sa propre direction, éclairée par une lumière (fixe ou qui suit
// le pointeur). Le shader ne sort que du blanc / noir semi-transparent : il
// éclaircit ou assombrit la couleur de la section sans la remplacer.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform vec2 r;
uniform float t;
uniform float blur, strength, scale, opacity, spec;
uniform vec2 light;
uniform bool follow;
uniform vec2 seed;
out vec4 o;

float h1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y);
}

// Le flou est un passe-bas : chaque octave est atténuée comme par un flou
// gaussien de rayon "blur", sans aucun échantillon supplémentaire.
float height(vec2 p) {
  float v = 0., a = .5, f = 1.;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 drift = vec2(cos(fi * 2.4), sin(fi * 2.4)) * t * (.04 + .025 * fi);
    float lp = exp(-2. * pow(f * blur * .9, 2.));
    v += a * lp * n(p * f + drift + fi * 7.3);
    f *= 2.07;
    a *= .55;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / r.y * 3. * scale + seed;
  float e = 1.5 / r.y * 3. * scale;
  float h0 = height(uv);
  vec3 N = normalize(vec3(h0 - height(uv + vec2(e, 0.)), h0 - height(uv + vec2(0., e)), e * 2.5));
  N = normalize(vec3(N.xy * strength, N.z));

  vec3 L = follow && light.x >= 0.
    ? normalize(vec3(light - gl_FragCoord.xy, r.y * .35))
    : normalize(vec3(-.55, .6, .58));
  float diff = dot(N, L) - L.z;
  vec3 H = normalize(L + vec3(0., 0., 1.));
  float s = pow(max(dot(N, H), 0.), 70.) * spec;
  float a = clamp(abs(diff) * opacity * 2.2 + s * opacity, 0., 1.);
  vec3 c = diff > 0. || s > abs(diff) ? vec3(1.) : vec3(0.);
  o = vec4(c * a, a);
}`;
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

interface Props {
  /** Lissage du relief, 0 = net, 1 = très flou */
  blur?: number;
  /** Présence du relief sur la couleur de la section */
  opacity?: number;
  /** Profondeur du relief */
  strength?: number;
  /** Taille des motifs (plus grand = motifs plus petits) */
  scale?: number;
  /** Intensité du reflet spéculaire */
  spec?: number;
  /** La lumière suit le pointeur (sinon lumière fixe en haut à gauche) */
  followPointer?: boolean;
  /** Vitesse de l'ondulation */
  speed?: number;
  /** Cadence maximale de rendu */
  fps?: number;
  /** Résolution de rendu relative à la taille affichée */
  resolution?: number;
}

const props = withDefaults(defineProps<Props>(), {
  blur: 0.35,
  opacity: 0.5,
  strength: 1,
  scale: 1,
  spec: 0.3,
  followPointer: true,
  speed: 1,
  fps: 30,
  resolution: 0.5,
});

// Plafond du buffer : la section #work peut faire plusieurs écrans de large.
const MAX_BUFFER_SIZE = 2048;

const canvasRef = ref<HTMLCanvasElement | null>(null);
let gl: WebGL2RenderingContext | null = null;
let uniforms: Record<string, WebGLUniformLocation | null> = {};
let rafId: number | null = null;
let resizeObserver: ResizeObserver | null = null;
let intersectionObserver: IntersectionObserver | null = null;
let isVisible = false;
let reduceMotion = false;
let lastFrame = 0;
let elapsed = 0;
const seed = [Math.random() * 100, Math.random() * 100];

function compile(type: number, source: string) {
  const shader = gl!.createShader(type)!;
  gl!.shaderSource(shader, source);
  gl!.compileShader(shader);
  if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
    console.error("[ReliefBackground]", gl!.getShaderInfoLog(shader));
  }
  return shader;
}

function initGL() {
  const canvas = canvasRef.value;
  if (!canvas) return false;

  gl = canvas.getContext("webgl2", {
    antialias: false,
    depth: false,
    premultipliedAlpha: true,
    powerPreference: "low-power",
  });
  if (!gl) return false;

  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(program);
  gl.useProgram(program);

  // Un triangle qui couvre tout l'écran
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  const location = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);

  uniforms = {};
  [
    "r",
    "t",
    "blur",
    "strength",
    "scale",
    "opacity",
    "spec",
    "light",
    "follow",
    "seed",
  ].forEach((name) => {
    uniforms[name] = gl!.getUniformLocation(program, name);
  });

  resize();
  return true;
}

function resize() {
  const canvas = canvasRef.value;
  if (!canvas || !gl) return;

  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  const ratio = Math.min(
    props.resolution,
    MAX_BUFFER_SIZE / Math.max(cssWidth, cssHeight, 1),
  );
  const width = Math.max(1, Math.round(cssWidth * ratio));
  const height = Math.max(1, Math.round(cssHeight * ratio));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
  }

  if (reduceMotion) draw();
}

function draw() {
  const canvas = canvasRef.value;
  if (!canvas || !gl) return;

  const rect = canvas.getBoundingClientRect();
  const lightX =
    pointerX < 0 ? -1 : (pointerX - rect.left) * (canvas.width / rect.width);
  const lightY = (rect.bottom - pointerY) * (canvas.height / rect.height);

  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform2f(uniforms.r!, canvas.width, canvas.height);
  gl.uniform1f(uniforms.t!, elapsed * 0.001);
  gl.uniform1f(uniforms.blur!, props.blur);
  gl.uniform1f(uniforms.strength!, props.strength);
  gl.uniform1f(uniforms.scale!, props.scale);
  gl.uniform1f(uniforms.opacity!, props.opacity);
  gl.uniform1f(uniforms.spec!, props.spec);
  gl.uniform2f(uniforms.light!, lightX, lightY);
  gl.uniform1i(uniforms.follow!, props.followPointer && !reduceMotion ? 1 : 0);
  gl.uniform2f(uniforms.seed!, seed[0]!, seed[1]!);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// rAF s'arrête tout seul quand l'onglet est caché ; la boucle ne tourne
// que tant que la section est visible.
function loop(now: number) {
  rafId = requestAnimationFrame(loop);
  if (now - lastFrame < 1000 / props.fps - 1) return;

  const delta = lastFrame ? Math.min(100, now - lastFrame) : 16;
  lastFrame = now;
  elapsed += delta * props.speed;
  draw();
}

function start() {
  if (rafId !== null || reduceMotion || !gl) return;
  lastFrame = 0;
  rafId = requestAnimationFrame(loop);
}

function stop() {
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
}

function handleContextLost(event: Event) {
  event.preventDefault();
  stop();
  gl = null;
}

function handleContextRestored() {
  if (initGL() && isVisible) start();
}

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  ensurePointerListener();

  canvas.addEventListener("webglcontextlost", handleContextLost);
  canvas.addEventListener("webglcontextrestored", handleContextRestored);

  if (!initGL()) return;

  // Avec reduced motion : une seule image fixe, redessinée au resize
  if (reduceMotion) {
    elapsed = 12000;
    draw();
  }

  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      isVisible = !!entry?.isIntersecting;
      if (isVisible) start();
      else stop();
    },
    { rootMargin: "100px" },
  );
  intersectionObserver.observe(canvas);
});

onBeforeUnmount(() => {
  stop();
  resizeObserver?.disconnect();
  intersectionObserver?.disconnect();
  const canvas = canvasRef.value;
  canvas?.removeEventListener("webglcontextlost", handleContextLost);
  canvas?.removeEventListener("webglcontextrestored", handleContextRestored);
  gl?.getExtension("WEBGL_lose_context")?.loseContext();
  gl = null;
});
</script>

<style scoped>
.relief-background {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
  display: block;
}
</style>
