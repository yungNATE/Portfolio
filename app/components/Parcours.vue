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
      <li v-for="step in steps" :key="step.titre" class="parcours__step">
        <p class="parcours__period">{{ step.periode }}</p>
        <h3 class="parcours__step-title">{{ step.titre }}</h3>
        <p class="parcours__place">{{ step.lieu }}</p>
        <p class="parcours__text">{{ step.description }}</p>
      </li>

      <!-- Étape ouverte : la suite du parcours, pas encore écrite -->
      <li class="parcours__step parcours__step--next">
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
.parcours {
  display: flex;
  align-items: flex-start;
  gap: clamp(2rem, 5vw, 4rem);
  width: max-content;
  color: #fff8f2;
}

.parcours__intro {
  flex: 0 0 auto;
  max-width: 420px;
  display: grid;
  gap: 1.5rem;
}

.parcours__lead {
  margin: 0;
  line-height: 1.6;
  opacity: 0.9;
}

// Frise : une colonne par étape, reliées par un trait continu
.parcours__timeline {
  flex: 0 0 auto;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 260px;
  gap: 1.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.parcours__step {
  position: relative;
  display: grid;
  align-content: start;
  gap: 0.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.4);

  // Jalon sur le trait
  &::before {
    content: "";
    position: absolute;
    top: -6px;
    left: 0;
    width: 11px;
    aspect-ratio: 1;
    border-radius: 50%;
    background: #fff8f2;
  }
}

// Étape à venir : trait pointillé et jalon vide qui pulse
.parcours__step--next {
  border-top-style: dashed;

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
  font-size: 0.92rem;
  line-height: 1.55;
  opacity: 0.9;
}

.parcours__axes {
  flex: 0 0 auto;
  width: min(80vw, 640px);
  display: grid;
  gap: 1.5rem;
  justify-items: start;
}

.parcours__axes-title {
  font-size: 1.5rem;
}

.parcours__axes-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.parcours__axe {
  display: grid;
  align-content: start;
  gap: 0.6rem;
  padding: 1.2rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
}

.parcours__axe-title {
  font-size: 1.05rem;
}

// Même critère que le passage en `.is-portrait` du scroll horizontal
// (ratio <= 1) : blocs empilés, frise verticale.
@media (max-aspect-ratio: 1/1) {
  .parcours {
    flex-direction: column;
    width: 100%;
  }

  .parcours__intro {
    max-width: none;
  }

  .parcours__timeline {
    grid-auto-flow: row;
    grid-auto-columns: auto;
    width: 100%;
  }

  .parcours__step {
    padding-top: 0;
    padding-left: 1.5rem;
    border-top: none;
    border-left: 1px solid rgba(255, 255, 255, 0.4);

    &.parcours__step--next {
      border-left-style: dashed;
    }

    &::before {
      top: 0;
      left: -6px;
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
