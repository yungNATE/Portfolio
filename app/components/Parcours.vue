<template>
  <div class="parcours" aria-labelledby="parcours-title">
    <div class="parcours__intro">
      <SectionHeading id="parcours-title" eyebrow="D'où je viens, où je vais">
        Parcours
      </SectionHeading>

      <p class="parcours__lead">
        Développeur frontend formé à l'UX, je passe de la maquette au code sans
        perdre le fil du besoin. Mon fil rouge : rendre simple ce qui ne l'est
        pas, pour l'utilisateur comme pour l'équipe qui maintient le produit.
      </p>
    </div>

    <ol class="parcours__timeline" aria-label="Étapes de mon parcours">
      <li
        v-for="(step, index) in steps"
        :key="step.titre"
        class="parcours__step"
        :class="{ 'is-below': index % 2 === 1 }"
        :style="{ '--col': index + 1 }"
      >
        <p class="parcours__period">{{ step.periode }}</p>
        <h3 class="parcours__step-title">{{ step.titre }}</h3>
        <p class="parcours__place">{{ step.lieu }}</p>
        <p class="parcours__text">{{ step.description }}</p>
      </li>

      <!-- Étape ouverte : la suite du parcours, pas encore écrite -->
      <li
        class="parcours__step parcours__step--next"
        :class="{ 'is-below': steps.length % 2 === 1 }"
        :style="{ '--col': steps.length + 1 }"
      >
        <p class="parcours__period">Disponible</p>
        <h3 class="parcours__step-title">La prochaine aventure ?</h3>
        <p class="parcours__place">Freelance ou CDI</p>
        <p class="parcours__text">
          Studio NAMA continue, mais je suis aussi ouvert à un CDI dans une
          équipe exigeante, où design et développement avancent ensemble.
        </p>
        <a href="#contact" class="anchor">Parlons-en</a>
      </li>
    </ol>

    <div class="parcours__axes">
      <h3 class="parcours__axes-title">Ce que j'apporte</h3>

      <ul class="parcours__axes-list">
        <li v-for="axe in axes" :key="axe.titre" class="parcours__axe">
          <h4 class="parcours__axe-title">{{ axe.titre }}</h4>
          <p class="parcours__text">{{ axe.description }}</p>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
type Step = {
  periode: string;
  titre: string;
  lieu: string;
  description: string;
};

type Axe = {
  titre: string;
  description: string;
};

// Du plus ancien au plus récent : lu de gauche à droite avec le scroll.
const steps: Step[] = [
  {
    periode: "2019 — 2021",
    titre: "DUT Informatique",
    lieu: "IUT de Bayonne",
    description:
      "Les bases du métier : programmation, gestion de projet et compétences transversales (économie, droit, communication).",
  },
  {
    periode: "2021 — 2022",
    titre: "Licence Pro Métiers du Numérique",
    lieu: "IUT de Bayonne",
    description:
      "Programmation, création multimédia (photo, vidéo, audio, maquettage) et gestion de projets : le premier pont entre code et design.",
  },
  {
    periode: "2021 — 2022",
    titre: "Alternance en agence web",
    lieu: "Redmoot",
    description:
      "Sites vitrines et e-commerce sous WordPress, de la récolte du besoin à la mise en production : back-office sur mesure (CPT, ACF), plugin d'export des ventes, réflexion SEO.",
  },
  {
    periode: "2022 — 2025",
    titre: "Master HIC",
    lieu: "Université de Technologie de Compiègne",
    description:
      "Recherche utilisateur, protocoles expérimentaux, serious games et creative coding. Missions en Junior Entreprise, dont un serious game RSE pour Airbus et l'interface Erasmus+ de l'UTC.",
  },
  {
    periode: "2024 — 2026",
    titre: "Développeur frontend",
    lieu: "Tech'Advantage",
    description:
      "Refonte des portails de médiathèques sous Drupal, sur un legacy hybride. Création en autonomie d'une bibliothèque de composants Vanilla JS et introduction de SCSS dans l'équipe.",
  },
  {
    periode: "2024 — aujourd'hui",
    titre: "Freelance",
    lieu: "Studio NAMA",
    description:
      "Conception et développement de sites sur mesure, de l'UX au déploiement : Nuxt, GSAP, CMS headless.",
  },
];

const axes: Axe[] = [
  {
    titre: "Designer et développeur",
    description:
      "Je maquette en sachant ce que coûte l'intégration, et j'intègre en comprenant l'intention du design. Moins d'allers-retours, moins de pertes en route.",
  },
  {
    titre: "Simplifier avant d'ajouter",
    description:
      "Isoler le vrai point de blocage, réduire la dette, unifier la stack : je préfère supprimer une couche que d'en empiler une nouvelle.",
  },
  {
    titre: "Autonome et force de proposition",
    description:
      "Je porte les initiatives qui manquent à une équipe (bibliothèque de composants, conventions CSS) et je crée les composants non prévus sans bloquer le projet.",
  },
  {
    titre: "Le soin comme standard",
    description:
      "Accessibilité (RGAA/WCAG), animations qui servent la lecture et code lisible par le prochain : le détail fait partie du livrable.",
  },
];
</script>

<style lang="scss" scoped>
// Paysage : intro et « Ce que j'apporte » empilés à gauche, frise en zigzag
// sur toute la hauteur à droite.
.parcours {
  --intro-width: clamp(420px, 38vw, 600px);
  --line-color: rgba(255, 255, 255, 0.4);

  display: grid;
  grid-template-columns: var(--intro-width) auto;
  grid-template-rows: auto minmax(0, 1fr);
  column-gap: clamp(2rem, 5vw, 4rem);
  row-gap: 2rem;
  width: max-content;
  height: 100%;
  color: #fff8f2;
}

.parcours__intro {
  grid-column: 1;
  grid-row: 1;
  display: grid;
  gap: 1.5rem;
}

.parcours__axes {
  grid-column: 1;
  grid-row: 2;
  align-self: start;
  display: grid;
  gap: 1rem;
  justify-items: start;
}

.parcours__lead {
  margin: 0;
  font-family: var(--font-text);
  font-size: 1.05rem;
  line-height: 1.6;
  opacity: 0.9;
}

// Frise : trait horizontal à mi-hauteur, étapes alternées au-dessus et en
// dessous. Chaque étape couvre deux demi-colonnes et la suivante démarre une
// demi-colonne plus loin, d'où le décalage.
.parcours__timeline {
  --half: 125px;

  position: relative;
  grid-column: 2;
  grid-row: 1 / -1;
  display: grid;
  grid-auto-columns: var(--half);
  grid-template-rows: 1fr 1fr;
  column-gap: 1.5rem;
  margin: 0;
  padding: 0;
  list-style: none;

  &::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--line-color);
  }
}

.parcours__step {
  position: relative;
  grid-column: var(--col) / span 2;
  grid-row: 1;
  align-self: end;
  display: grid;
  align-content: start;
  gap: 0.5rem;
  // Tige qui relie l'étape au trait
  padding: 0 0 2rem 1rem;
  border-left: 1px solid var(--line-color);

  // Jalon sur le trait, au pied de la tige
  &::before {
    content: "";
    position: absolute;
    bottom: -6px;
    left: -6px;
    width: 11px;
    aspect-ratio: 1;
    border-radius: 50%;
    background: #fff8f2;
  }

  &.is-below {
    grid-row: 2;
    align-self: start;
    padding: 2rem 0 0 1rem;

    &::before {
      top: -6px;
      bottom: auto;
    }
  }
}

// Étape à venir : tige pointillée et jalon vide qui pulse
.parcours__step--next {
  border-left-style: dashed;

  &::before {
    background: transparent;
    border: 2px solid #fff8f2;
    animation: parcours-pulse 2s ease-in-out infinite;
  }

  .anchor {
    justify-self: start;
    margin-top: 0.5rem;
    color: inherit;
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      animation: none;
    }
  }
}

@keyframes parcours-pulse {
  50% {
    box-shadow: 0 0 0 6px rgba(255, 248, 242, 0.25);
  }
}

.parcours__period {
  justify-self: start;
  margin: 0;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  font-size: 0.85rem;
}

.parcours__step-title,
.parcours__axes-title,
.parcours__axe-title {
  margin: 0;
}

.parcours__step-title {
  font-size: 1.25rem;
}

.parcours__place {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.72;
}

.parcours__text {
  margin: 0;
  font-family: var(--font-text);
  font-size: 0.95rem;
  line-height: 1.55;
  opacity: 0.9;
}

.parcours__axes-title {
  font-size: 1.5rem;
}

.parcours__axes-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.parcours__axe {
  display: grid;
  align-content: start;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
}

.parcours__axe-title {
  font-size: 1.05rem;
}

// Écran paysage peu haut : la colonne de gauche ne tient plus, « Ce que
// j'apporte » reprend sa propre colonne entre l'intro et la frise.
@media (max-height: 780px) {
  .parcours {
    grid-template-columns: var(--intro-width) min(80vw, 640px) auto;
    grid-template-rows: auto;
  }

  .parcours__axes {
    grid-column: 2;
    grid-row: 1;
  }

  .parcours__timeline {
    grid-column: 3;
    grid-row: 1;
  }
}

// Même critère que le passage en `.is-portrait` du scroll horizontal
// (ratio <= 1) : blocs empilés, frise verticale.
@media (max-aspect-ratio: 1/1) {
  .parcours {
    display: flex;
    flex-direction: column;
    gap: clamp(2rem, 5vw, 4rem);
    width: 100%;
    height: auto;
  }

  .parcours__timeline {
    grid-template-rows: none;
    grid-auto-columns: auto;
    row-gap: 1.5rem;
    width: 100%;

    &::before {
      display: none;
    }
  }

  .parcours__step,
  .parcours__step.is-below {
    grid-column: auto;
    grid-row: auto;
    align-self: auto;
    padding: 0 0 0 1.5rem;

    &::before {
      top: 0;
      bottom: auto;
    }
  }

  .parcours__axes {
    width: 100%;
  }
}

@media (max-width: 720px) {
  .parcours__axes-list {
    grid-template-columns: 1fr;
  }
}
</style>
