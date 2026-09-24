<template>
  <div
    ref="container"
    class="magnetic-cursor"
    :class="{ 'is-visible': isVisible }"
    :style="{
      '--cursor-color': color,
      '--cursor-blend': mixBlend ? 'difference' : 'normal',
    }"
    aria-hidden="true"
  >
    <div ref="cursorDot" class="magnetic-cursor__dot" />

    <!-- Zone qui se déplace au cliquer-glisser ([data-cursor="grab"]) :
         le curseur natif étant masqué, c'est lui qui l'annonce. -->
    <div
      ref="cursorLabel"
      class="magnetic-cursor__label"
      :class="{ 'is-visible': grabAxis, 'is-grabbing': grabAxis && isPressed }"
    >
      <!-- Main (icône "hand" de Lucide, ISC). -->
      <svg viewBox="0 0 24 24">
        <path d="M18 11V6a2 2 0 0 0-4 0" />
        <path d="M14 10V4a2 2 0 0 0-4 0v2" />
        <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
        <path
          d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"
        />
      </svg>
      Glisser
    </div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

import * as THREE from "three";

const props = defineProps({
  // Couleur du dot, du ring et des particules.
  // Blanc par défaut : avec mixBlend, ça reste lisible
  // quel que soit le fond derrière.
  color: {
    type: String,
    default: "#ffffff",
  },
  // mix-blend-mode: difference sur le curseur.
  // Garantit un contraste automatique sur n'importe quel fond.
  // Volontairement non réactif après le montage.
  mixBlend: {
    type: Boolean,
    default: true,
  },
});

const container = ref(null);
const cursorDot = ref(null);
const cursorLabel = ref(null);

// Axe de la zone [data-cursor="grab"] survolée ("x", "y" ou "xy"),
// null en dehors. Lu dans data-cursor-axis, "xy" par défaut.
const grabAxis = ref(null);
const isPressed = ref(false);

// Passe à true au premier mouvement réel de la souris.
// Évite l'effet "pop" depuis le centre de l'écran au chargement.
const isVisible = ref(false);

let renderer;
let scene;
let camera;
let points;
let geometry;
let material;

let animationFrame = 0;
let resizeObserver;
let mutationObserver;

// true seulement si le setup a réellement été effectué
// (souris fine + hover dispo + pas de reduced-motion).
let enabled = false;

const clock = new THREE.Clock();

/**
 * ---------------------------------------------------------
 * Configuration
 * ---------------------------------------------------------
 */

const PARTICLE_COUNT = 90;

// Distance à partir de laquelle un élément commence
// à influencer les particules.
const MAGNETIC_RADIUS = 170;

// Distance à laquelle l'élément prend réellement
// le contrôle du champ.
const CLOSE_RADIUS = 70;

// Quand le curseur est dans l'élément.
const HOVER_RADIUS = 12;

// Nuage de particules : origine figée à la naissance + orbite +
// traînée.
//
// Pas de ressort/vélocité ici (c'est ce qui causait l'effet
// "élastique") : chaque particule rattrape en douceur une
// position orbitale calculée à chaque frame. Convergence
// exponentielle pure, jamais de dépassement/rebond.
//
// Rayon volontairement petit : la traînée doit rester discrète,
// pas former un gros nuage autour du curseur.
const CLOUD_RADIUS_MIN = 6;
const CLOUD_RADIUS_MAX = 22;

// Vitesse de transition de l'ancre (curseur <-> élément survolé).
// Assez réactive : c'est elle qui pilote le magnétisme, elle doit
// suivre la souris sans traîner.
const ANCHOR_EASE = 0.18;

// Vitesse à laquelle l'origine d'une particule DÉJÀ vivante se
// laisse tirer vers un élément magnétique (uniquement quand il y
// a une influence active, voir simulateParticle). En dehors de ça,
// l'origine ne bouge JAMAIS après la naissance de la particule :
// c'est ce qui garantit une vraie traînée. Si l'origine continuait
// à rattraper le curseur en continu, toutes les particules
// finiraient par se réaligner sur lui, quelle que soit la lenteur
// du rattrapage — et on retombe sur une boule qui suit, pas une
// trace du chemin parcouru.
const ORIGIN_MAGNET_EASE = 0.08;

// Vitesse de rattrapage de la position réelle vers la position
// orbitale (autour de l'origine de la particule, pas de l'ancre).
const TRAIL_EASE = 0.2;

// Vitesse angulaire de référence (rad/s), divisée par le rayon
// de chaque particule : les particules proches de l'ancre
// tournent plus vite que les lointaines (rotation différentielle,
// comme un disque d'accrétion). Réduite pour rester douce vu le
// rayon désormais plus petit.
const ORBIT_SPEED = 30;

// Légère respiration du rayon, pour un rendu organique.
const BREATHING_AMPLITUDE = 2;

// Halo autour d'un élément survolé : les particules s'étirent
// pour englober l'élément plutôt que de rester collées à son centre.
const HALO_PADDING = 22;
const MAX_HALO_RADIUS = 200;

// Cycle de vie des particules : chacune naît sur l'ancre courante,
// vit un court instant en s'estompant, puis renaît ailleurs.
// Comme chaque particule garde son origine figée (voir plus haut),
// la population vivante à un instant T trace littéralement les
// positions récentes du curseur — c'est ÇA, la traînée.
const PARTICLE_MIN_LIFE = 0.7;
const PARTICLE_MAX_LIFE = 1.6;

// Fraction de la vie passée à apparaître (fade-in rapide). Le
// reste de la vie est un fade-out progressif : c'est ce long
// fade-out, pas un pic symétrique, qui donne le dégradé net de la
// tête (vive, proche du curseur) vers la queue (estompée, loin
// derrière) d'une vraie traînée.
const PARTICLE_FADE_IN = 0.12;

// Dispersion du point d'apparition autour de l'ancre.
const SPAWN_JITTER = 6;

const mouse = {
  x: 0,
  y: 0,
  active: false,
};

// Ancre gravitationnelle du nuage : suit la souris, ou glisse
// vers l'élément magnétique le plus proche/survolé.
const anchor = {
  x: 0,
  y: 0,
  // 0 = ancrée sur le curseur, 1 = ancrée sur l'élément.
  influence: 0,
  // Rayon du halo de l'élément actif (0 si aucun).
  targetHaloRadius: 0,
};

const particles = [];

const interactiveElements = [];

let activeElement = null;

// true uniquement quand le curseur est réellement DANS
// un élément (par opposition à "juste proche").
let isHoveringElement = false;

/**
 * ---------------------------------------------------------
 * DOM interactif
 * ---------------------------------------------------------
 *
 * Tout est automatique :
 *
 * a
 * button
 * input
 * textarea
 * select
 * summary
 * [role=button]
 * [role=link]
 * [tabindex]
 */

const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "textarea",
  "select",
  "summary",
  '[role="button"]',
  '[role="link"]',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(",");

/**
 * Rebuild de la liste des éléments interactifs.
 *
 * On ne fait PAS querySelectorAll() à chaque frame.
 * C'est important pour garder le composant léger.
 */
function refreshInteractiveElements() {
  interactiveElements.length = 0;

  const elements = document.querySelectorAll(INTERACTIVE_SELECTOR);

  for (const element of elements) {
    const rect = element.getBoundingClientRect();

    interactiveElements.push({
      element,
      rect: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        x: rect.left + rect.width * 0.5,
        y: rect.top + rect.height * 0.5,
      },
    });
  }
}

/**
 * Met à jour les rectangles uniquement quand nécessaire.
 */
function updateInteractiveRects() {
  for (const item of interactiveElements) {
    const rect = item.element.getBoundingClientRect();

    item.rect.left = rect.left;
    item.rect.top = rect.top;
    item.rect.right = rect.right;
    item.rect.bottom = rect.bottom;
    item.rect.width = rect.width;
    item.rect.height = rect.height;
    item.rect.x = rect.left + rect.width * 0.5;
    item.rect.y = rect.top + rect.height * 0.5;
  }
}

/**
 * Détermine :
 *
 * - l'élément hover
 * - l'élément magnétique le plus proche
 */
function findMagneticElement() {
  let closest = null;
  let closestDistance = Infinity;

  for (const item of interactiveElements) {
    const dx = item.rect.x - mouse.x;
    const dy = item.rect.y - mouse.y;

    const distance = Math.sqrt(dx * dx + dy * dy);

    // Hover réel : le curseur est dans le rect.
    const inside =
      mouse.x >= item.rect.left - HOVER_RADIUS &&
      mouse.x <= item.rect.right + HOVER_RADIUS &&
      mouse.y >= item.rect.top - HOVER_RADIUS &&
      mouse.y <= item.rect.bottom + HOVER_RADIUS;

    if (inside) {
      activeElement = item;
      isHoveringElement = true;
      return item;
    }

    // Sinon on cherche le centre magnétique le plus proche.
    if (distance < closestDistance && distance < MAGNETIC_RADIUS) {
      closestDistance = distance;
      closest = item;
    }
  }

  activeElement = closest;
  isHoveringElement = false;
  return closest;
}

/**
 * ---------------------------------------------------------
 * Three.js
 * ---------------------------------------------------------
 */

function hexToVector3(hex) {
  const color = new THREE.Color(hex);
  return new THREE.Vector3(color.r, color.g, color.b);
}

function createRenderer() {
  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.domElement.className = "magnetic-cursor__canvas";

  renderer.domElement.setAttribute("aria-hidden", "true");

  renderer.domElement.style.mixBlendMode = props.mixBlend
    ? "difference"
    : "normal";

  container.value.appendChild(renderer.domElement);
}

function createScene() {
  scene = new THREE.Scene();

  camera = new THREE.OrthographicCamera(
    0,
    window.innerWidth,
    window.innerHeight,
    0,
    -100,
    100,
  );

  camera.position.z = 10;
}

/**
 * Particules sous forme de THREE.Points.
 *
 * La géométrie est gardée en permanence.
 * On ne recrée jamais le buffer pendant l'animation.
 */
function createParticles() {
  const positions = new Float32Array(PARTICLE_COUNT * 3);

  const sizes = new Float32Array(PARTICLE_COUNT);

  const alphas = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = THREE.MathUtils.lerp(
      CLOUD_RADIUS_MIN,
      CLOUD_RADIUS_MAX,
      Math.sqrt(Math.random()),
    );

    const maxLife = THREE.MathUtils.lerp(
      PARTICLE_MIN_LIFE,
      PARTICLE_MAX_LIFE,
      Math.random(),
    );

    const x = mouse.x + Math.cos(angle) * radius;
    const y = mouse.y + Math.sin(angle) * radius;

    const index = i * 3;

    positions[index] = x;
    positions[index + 1] = y;
    positions[index + 2] = 0;

    // Tailles discrètes, opacité un peu plus visible.
    const size = 1 + Math.random() * 1.4;
    const alpha = 0.22 + Math.random() * 0.4;

    sizes[i] = size;
    alphas[i] = alpha;

    particles.push({
      x,
      y,

      // Centre d'orbite propre à la particule, figé à la naissance
      // (sauf attraction magnétique). C'est ce point fixe qui,
      // multiplié sur toute la population, dessine la traînée.
      originX: mouse.x,
      originY: mouse.y,

      seed: Math.random() * 1000,

      // Angle vivant : incrémenté chaque frame, c'est lui qui
      // fait réellement tourner la particule autour de son origine.
      angle,
      cloudRadius: radius,

      // Rotation différentielle : plus proche de l'ancre = plus rapide.
      // Même sens pour toutes les particules : ça lit comme une
      // vraie orbite plutôt qu'un nuage électronique désordonné.
      angularSpeed: (ORBIT_SPEED / radius) * (0.8 + Math.random() * 0.4),

      // Taille/opacité "pleine" de la particule : le rendu réel
      // est modulé par l'enveloppe de vie (voir updateGeometry).
      size,
      alpha,

      // Sert de "masse" pour la traînée : une particule plus
      // lourde rattrape sa position orbitale plus lentement.
      mass: 0.75 + Math.random() * 0.5,

      // Cycle de vie : phase de départ décalée aléatoirement pour
      // que toutes les particules n'apparaissent/disparaissent pas
      // en même temps.
      maxLife,
      life: Math.random() * maxLife,
    });
  }

  geometry = new THREE.BufferGeometry();

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

  geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));

  /**
   * Shader minuscule :
   *
   * La physique est CPU.
   * Le rendu des 180 points est GPU.
   */
  material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,

    uniforms: {
      uPixelRatio: {
        value: Math.min(window.devicePixelRatio, 1.5),
      },
      uTime: {
        value: 0,
      },
      uColor: {
        value: hexToVector3(props.color),
      },
    },

    vertexShader: `
      attribute float aSize;
      attribute float aAlpha;

      varying float vAlpha;

      uniform float uPixelRatio;

      void main() {
        vec4 mvPosition =
          modelViewMatrix *
          vec4(position, 1.0);

        gl_Position =
          projectionMatrix *
          mvPosition;

        gl_PointSize =
          aSize *
          uPixelRatio *
          2.0;

        vAlpha = aAlpha;
      }
    `,

    fragmentShader: `
      varying float vAlpha;

      uniform vec3 uColor;

      void main() {
        vec2 uv =
          gl_PointCoord -
          vec2(0.5);

        float distance =
          length(uv);

        float glow =
          1.0 -
          smoothstep(
            0.0,
            0.5,
            distance
          );

        float alpha =
          glow *
          vAlpha;

        gl_FragColor =
          vec4(
            uColor,
            alpha
          );
      }
    `,
  });

  points = new THREE.Points(geometry, material);

  scene.add(points);
}

/**
 * ---------------------------------------------------------
 * Physique
 * ---------------------------------------------------------
 */

function smoothstep(min, max, value) {
  const t = THREE.MathUtils.clamp((value - min) / (max - min), 0, 1);

  return t * t * (3 - 2 * t);
}

/**
 * Une seule ancre gravitationnelle pour tout le nuage :
 *
 * - par défaut, c'est le curseur.
 * - à l'approche d'un élément magnétique, l'ancre RESTE sur le
 *   curseur — seul le halo (rayon d'orbite) grossit
 *   progressivement, pour donner la sensation d'approche sans
 *   faire flotter un point d'orbite dans le vide entre le curseur
 *   et l'élément.
 * - en hover réel, l'ancre EST l'élément, et le halo s'étire pour
 *   englober toute sa surface : les particules gravitent alors
 *   tout autour de lui.
 *
 * Chaque particule ne vise PAS l'ancre directement, et surtout :
 * son origine ne bouge PAS après sa naissance (sauf attraction
 * magnétique active, voir plus bas). Chaque particule fige donc
 * littéralement l'endroit où était le curseur au moment où elle
 * est née. Comme les particules naissent en continu à des instants
 * différents, la population vivante à un instant T trace le
 * chemin récent du curseur — c'est ÇA qui fait une traînée plutôt
 * qu'une boule qui suit avec un simple retard.
 *
 * Autour de cette origine fixe, chaque particule orbite en continu
 * (rotation vivante) et rattrape sa position orbitale par un lerp
 * pur — jamais par un ressort, donc jamais de rebond élastique.
 *
 * Chaque particule a aussi une durée de vie courte : elle naît
 * sur l'ancre, dérive dans son orbite en s'estompant, puis
 * renaît ailleurs. C'est cette apparition/disparition continue,
 * décalée entre particules, qui anime la traînée.
 */
function simulateParticle(particle, dt) {
  particle.life += dt;

  if (particle.life >= particle.maxLife) {
    respawnParticle(particle);
  }

  // L'origine ne rattrape l'ancre QUE s'il y a une influence
  // magnétique active (élément proche/survolé). Sans ça, elle ne
  // bouge jamais après la naissance : c'est ce qui préserve la
  // traînée. Si elle rattrapait le curseur en continu, toutes les
  // particules finiraient par s'y réaligner — boule garantie,
  // même avec un rattrapage très lent.
  if (anchor.influence > 0) {
    const ease = ORIGIN_MAGNET_EASE * anchor.influence;

    particle.originX += (anchor.x - particle.originX) * ease;
    particle.originY += (anchor.y - particle.originY) * ease;
  }

  const time = clock.elapsedTime;

  particle.angle += particle.angularSpeed * dt;

  const breathing =
    Math.sin(time * 0.9 + particle.seed * 1.7) * BREATHING_AMPLITUDE;

  const baseRadius = particle.cloudRadius + breathing;

  // Le rayon d'orbite s'étire vers le halo de l'élément actif,
  // proportionnellement à l'influence (0 = pas d'élément, 1 = hover).
  const radius = THREE.MathUtils.lerp(
    baseRadius,
    anchor.targetHaloRadius,
    anchor.influence,
  );

  const targetX = particle.originX + Math.cos(particle.angle) * radius;
  const targetY = particle.originY + Math.sin(particle.angle) * radius;

  // Traînée locale : convergence exponentielle pure vers la
  // position orbitale (autour de l'origine), jamais de dépassement.
  const ease = TRAIL_EASE / particle.mass;

  particle.x += (targetX - particle.x) * ease;
  particle.y += (targetY - particle.y) * ease;
}

/**
 * Fait renaître une particule sur l'ancre courante (curseur ou
 * élément magnétique), avec une nouvelle origine, une nouvelle
 * orbite et une nouvelle durée de vie. Un léger jitter au point
 * d'apparition évite que toutes les particules ne renaissent au
 * même pixel.
 */
function respawnParticle(particle) {
  particle.life = 0;
  particle.maxLife = THREE.MathUtils.lerp(
    PARTICLE_MIN_LIFE,
    PARTICLE_MAX_LIFE,
    Math.random(),
  );

  particle.originX = anchor.x;
  particle.originY = anchor.y;

  particle.angle = Math.random() * Math.PI * 2;
  particle.cloudRadius = THREE.MathUtils.lerp(
    CLOUD_RADIUS_MIN,
    CLOUD_RADIUS_MAX,
    Math.sqrt(Math.random()),
  );
  particle.angularSpeed =
    (ORBIT_SPEED / particle.cloudRadius) * (0.8 + Math.random() * 0.4);

  const jitterAngle = Math.random() * Math.PI * 2;
  const jitterRadius = Math.random() * SPAWN_JITTER;

  particle.x = particle.originX + Math.cos(jitterAngle) * jitterRadius;
  particle.y = particle.originY + Math.sin(jitterAngle) * jitterRadius;
}

function updatePhysics(delta) {
  const item = findMagneticElement();

  /**
   * Limite delta pour éviter qu'un onglet
   * inactif fasse exploser la simulation.
   */
  const dt = Math.min(delta, 0.033);

  let desiredAnchorX = mouse.x;
  let desiredAnchorY = mouse.y;
  let desiredInfluence = 0;

  if (item) {
    const dx = item.rect.x - mouse.x;
    const dy = item.rect.y - mouse.y;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;

    // Hover réel = influence totale et immédiate.
    // Simple approche = influence progressive selon la distance,
    // exactement comme le champ magnétique déjà utilisé ailleurs.
    desiredInfluence = isHoveringElement
      ? 1
      : 1 - smoothstep(CLOSE_RADIUS, MAGNETIC_RADIUS, distance);

    // Important : pendant la simple approche, l'ancre RESTE sur le
    // curseur. La déplacer progressivement vers l'élément créait un
    // point d'orbite intermédiaire flottant dans le vide entre le
    // curseur et l'élément — inélégant. Seul le halo (rayon, via
    // desiredInfluence plus bas) grossit pour donner la sensation
    // d'approche ; l'ancre elle-même ne bascule sur l'élément qu'au
    // hover réel, d'un coup (adouci ensuite par ANCHOR_EASE).
    if (isHoveringElement) {
      desiredAnchorX = item.rect.x;
      desiredAnchorY = item.rect.y;
    }

    anchor.targetHaloRadius = Math.min(
      Math.hypot(item.rect.width, item.rect.height) * 0.5 + HALO_PADDING,
      MAX_HALO_RADIUS,
    );
  }

  anchor.x += (desiredAnchorX - anchor.x) * ANCHOR_EASE;
  anchor.y += (desiredAnchorY - anchor.y) * ANCHOR_EASE;
  anchor.influence += (desiredInfluence - anchor.influence) * ANCHOR_EASE;

  for (let i = 0; i < particles.length; i++) {
    simulateParticle(particles[i], dt);
  }
}

/**
 * ---------------------------------------------------------
 * Synchronisation GPU
 * ---------------------------------------------------------
 */

/**
 * L'enveloppe de vie d'une particule.
 *
 * Volontairement ASYMÉTRIQUE, et c'est important : un simple
 * sinus (montée puis descente symétriques) rend invisibles à la
 * fois les particules qui viennent de naître (proches du curseur)
 * ET celles qui vont mourir (loin derrière) — il ne reste visible
 * qu'un petit paquet de particules d'âge moyen, à peu près au même
 * décalage. Ça bouge comme un blob, pas comme une traînée.
 *
 * Ici : apparition rapide, puis un long fade-out qui occupe presque
 * toute la vie de la particule. Résultat : à un instant donné, on
 * voit tout le spectre des âges — vif près du curseur, de plus en
 * plus estompé en s'éloignant — soit exactement le dégradé
 * tête/queue d'une vraie traînée.
 */
function lifeEnvelope(particle) {
  const t = Math.min(particle.life / particle.maxLife, 1);

  if (t < PARTICLE_FADE_IN) {
    return t / PARTICLE_FADE_IN;
  }

  const fadeOutT = (t - PARTICLE_FADE_IN) / (1 - PARTICLE_FADE_IN);

  return Math.pow(1 - fadeOutT, 1.4);
}

function updateGeometry() {
  const positionAttribute = geometry.getAttribute("position");
  const sizeAttribute = geometry.getAttribute("aSize");
  const alphaAttribute = geometry.getAttribute("aAlpha");

  const positions = positionAttribute.array;
  const sizes = sizeAttribute.array;
  const alphas = alphaAttribute.array;

  for (let i = 0; i < particles.length; i++) {
    const particle = particles[i];

    const index = i * 3;

    positions[index] = particle.x;
    positions[index + 1] = window.innerHeight - particle.y;
    positions[index + 2] = 0;

    const envelope = lifeEnvelope(particle);

    // La taille suit un peu l'enveloppe elle aussi : la particule
    // grossit légèrement en apparaissant, rétrécit en disparaissant,
    // plutôt que de simplement clignoter à taille fixe.
    sizes[i] = particle.size * (0.4 + 0.6 * envelope);
    alphas[i] = particle.alpha * envelope;
  }

  positionAttribute.needsUpdate = true;
  sizeAttribute.needsUpdate = true;
  alphaAttribute.needsUpdate = true;
}

/**
 * ---------------------------------------------------------
 * Curseur (dot)
 * ---------------------------------------------------------
 *
 * Le dot suit la souris au pixel près : c'est le point de
 * référence exact, pas de lissage, pas de magnétisme dessus.
 * Le magnétisme et l'attraction vers les éléments s'expriment
 * entièrement à travers la traînée de particules.
 */
function updateCursorVisual() {
  if (cursorDot.value) {
    cursorDot.value.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0) translate(-50%, -50%)`;
  }
  if (cursorLabel.value) {
    cursorLabel.value.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
  }
}

/**
 * ---------------------------------------------------------
 * Mouse
 * ---------------------------------------------------------
 */

function onPointerMove(event) {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
  mouse.active = true;

  if (!isVisible.value) {
    isVisible.value = true;
  }

  // Pendant un drag, la zone capture le pointeur : event.target reste
  // dans la zone, l'état grab tient jusqu'au relâchement.
  const zone = event.target?.closest?.('[data-cursor="grab"]');
  const axis = zone ? zone.dataset.cursorAxis || "xy" : null;
  if (axis !== grabAxis.value) {
    grabAxis.value = axis;
  }
}

function onPointerLeave() {
  mouse.active = false;
  isVisible.value = false;
}

function onPointerDown(event) {
  if (event.button === 0) isPressed.value = true;
}

function onPointerUp() {
  isPressed.value = false;
}

/**
 * ---------------------------------------------------------
 * Resize
 * ---------------------------------------------------------
 */

function resize() {
  if (!renderer || !camera) {
    return;
  }

  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  camera.right = window.innerWidth;

  camera.top = window.innerHeight;

  camera.updateProjectionMatrix();

  if (material) {
    material.uniforms.uPixelRatio.value = Math.min(
      window.devicePixelRatio,
      1.5,
    );
  }

  updateInteractiveRects();
}

/**
 * ---------------------------------------------------------
 * Render loop
 * ---------------------------------------------------------
 */

function animate() {
  animationFrame = requestAnimationFrame(animate);

  const delta = clock.getDelta();

  /**
   * On laisse les rectangles suivre
   * le layout sans scanner le DOM.
   */
  updateInteractiveRects();

  updatePhysics(delta);
  updateGeometry();
  updateCursorVisual();

  material.uniforms.uTime.value = clock.elapsedTime;

  renderer.render(scene, camera);
}

/**
 * ---------------------------------------------------------
 * Support (souris fine, hover, reduced-motion)
 * ---------------------------------------------------------
 */

function supportsCustomCursor() {
  return (
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * ---------------------------------------------------------
 * Lifecycle
 * ---------------------------------------------------------
 */

onMounted(async () => {
  await nextTick();

  // Sur mobile/tactile ou reduced-motion, on ne fait rien du tout :
  // pas de rAF, pas de listeners, pas de MutationObserver.
  // Le curseur natif reste actif (la règle CSS @media s'en charge
  // aussi côté affichage, ceci évite en plus le travail JS inutile).
  if (!supportsCustomCursor()) {
    return;
  }

  enabled = true;

  mouse.x = window.innerWidth * 0.5;
  mouse.y = window.innerHeight * 0.5;

  anchor.x = mouse.x;
  anchor.y = mouse.y;

  createRenderer();
  createScene();
  createParticles();

  refreshInteractiveElements();

  window.addEventListener("pointermove", onPointerMove, {
    passive: true,
  });

  window.addEventListener("pointerleave", onPointerLeave);

  window.addEventListener("pointerdown", onPointerDown, { passive: true });
  window.addEventListener("pointerup", onPointerUp, { passive: true });
  window.addEventListener("pointercancel", onPointerUp, { passive: true });

  window.addEventListener("resize", resize);

  /**
   * Si Vue ajoute/supprime des boutons,
   * notre champ magnétique reste à jour.
   */
  mutationObserver = new MutationObserver(() => {
    refreshInteractiveElements();
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  resizeObserver = new ResizeObserver(() => {
    resize();
  });

  resizeObserver.observe(document.body);

  document.documentElement.classList.add("has-custom-cursor");

  animationFrame = requestAnimationFrame(animate);
});

onBeforeUnmount(() => {
  if (!enabled) {
    return;
  }

  cancelAnimationFrame(animationFrame);

  window.removeEventListener("pointermove", onPointerMove);

  window.removeEventListener("pointerleave", onPointerLeave);

  window.removeEventListener("pointerdown", onPointerDown);
  window.removeEventListener("pointerup", onPointerUp);
  window.removeEventListener("pointercancel", onPointerUp);

  window.removeEventListener("resize", resize);

  resizeObserver?.disconnect();
  mutationObserver?.disconnect();

  geometry?.dispose();
  material?.dispose();
  renderer?.dispose();

  renderer?.domElement.remove();

  document.documentElement.classList.remove("has-custom-cursor");
});

// Couleur réactive : met à jour le nuage de particules
// si le prop change en cours de vie du composant.
watch(
  () => props.color,
  (hex) => {
    if (!material) {
      return;
    }

    material.uniforms.uColor.value.copy(hexToVector3(hex));
  },
);
</script>

<style scoped>
.magnetic-cursor {
  position: fixed;
  inset: 0;

  z-index: 999999;

  pointer-events: none;

  overflow: hidden;

  opacity: 0;
  transition: opacity 0.3s ease;
}

.magnetic-cursor.is-visible {
  opacity: 1;
}

.magnetic-cursor :deep(.magnetic-cursor__canvas) {
  position: absolute;
  inset: 0;

  display: block;
  width: 100%;
  height: 100%;

  pointer-events: none;

  z-index: 1;
}

.magnetic-cursor__dot {
  position: absolute;
  top: 0;
  left: 0;

  width: 8px;
  height: 8px;

  border-radius: 50%;
  background-color: var(--cursor-color, #fff);

  z-index: 2;

  will-change: transform;
  mix-blend-mode: var(--cursor-blend, difference);
}

.magnetic-cursor__label {
  position: absolute;
  top: 0;
  left: 0;

  display: flex;
  align-items: center;
  gap: 0.35em;

  /* Centré au-dessus du dot : en bas à droite, la place est déjà prise
     par les infobulles qui suivent le curseur (ex. résumé des projets). */
  translate: -50% calc(-100% - 14px);
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  background: rgba(20, 20, 18, 0.9);
  backdrop-filter: blur(8px);
  color: #fff8f2;
  font-size: 0.75rem;
  white-space: nowrap;

  z-index: 2;
  will-change: transform;

  /* Suit toujours le pointeur, masquée : seule l'opacité change. */
  opacity: 0;
  transition: opacity 0.2s ease;
}

.magnetic-cursor__label.is-visible {
  opacity: 1;
}

/* Pendant la saisie : simple fondu. */
.magnetic-cursor__label.is-visible.is-grabbing {
  opacity: 0;
}

.magnetic-cursor__label svg {
  flex: none;
  width: 1.1em;
  height: 1.1em;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;

  animation: magnetic-cursor-grab 1.8s ease-in-out infinite;
}

@keyframes magnetic-cursor-grab {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

@media (hover: none), (pointer: coarse) {
  .magnetic-cursor {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .magnetic-cursor {
    display: none;
  }
}
</style>

<style>
/*
  Non-scoped volontairement : on doit masquer le curseur natif
  sur TOUTE la page, pas seulement à l'intérieur du composant.
  La classe n'est posée sur <html> que si supportsCustomCursor()
  a validé (souris fine, hover, pas de reduced-motion).
*/
html.has-custom-cursor,
html.has-custom-cursor * {
  cursor: none !important;
}
</style>
