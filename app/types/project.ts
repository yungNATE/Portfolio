// Sous-ensemble de la collection `projets` (content.config.ts) chargé par
// Projects.vue pour la liste des projets.

export type Cover = {
  src?: string;
  alt?: string;
  legende?: string;
  type?: string;
};

export type ProjectItem = {
  path?: string;
  titre: string;
  sousTitre?: string;
  resume?: string;
  tags: string[];
  couverture?: Cover;
  niveauImportance?: "phare" | "standard" | "discret";
  ordreAffichage?: number;
  visible?: boolean;
};
