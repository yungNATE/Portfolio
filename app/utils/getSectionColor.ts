/**
 * Couleur sombre par défaut (variable CSS --color-dark), utilisée hors des
 * sections colorées, par exemple sur une autre page que l'accueil.
 */
export function getDefaultColor(): string {
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue("--color-dark")
      .trim() || "#141412"
  );
}

/**
 * Récupère la couleur d'une section à partir de :
 * 1. L'attribut data-color
 * 2. La variable CSS --section-color
 * 3. Défaut : la couleur sombre --color-dark
 */
export function getSectionColor(section: HTMLElement | null): string {
  if (!section) {
    return getDefaultColor();
  }

  const dataColor = section.dataset.color?.trim();

  if (dataColor) {
    return dataColor;
  }

  const cssColor = getComputedStyle(section)
    .getPropertyValue("--section-color")
    .trim();

  return cssColor || getDefaultColor();
}
