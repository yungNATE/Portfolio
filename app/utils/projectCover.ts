import type { ProjectItem } from "~/types/project";

// Image d'un ProjectDot, à sa taille max (x1 et x2 pour les écrans haute
// densité). Fixe pour que `nuxt generate` pré-génère toujours les mêmes
// variantes _ipx ; la modale la réutilise (déjà en cache) pendant le morph.
export const PROJECT_DOT_IMAGE = {
  width: 190,
  height: 190,
  fit: "cover",
  densities: "x1 x2",
  quality: 68,
  loading: "lazy",
  format: "webp",
} as const;

export function projectCoverSrc(project: ProjectItem) {
  return project.couverture?.src?.trim() || "/basicCover.png";
}
