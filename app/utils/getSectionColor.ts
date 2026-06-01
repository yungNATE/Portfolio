/**
 * Récupère la couleur d'une section à partir de :
 * 1. L'attribut data-color
 * 2. La variable CSS --section-color
 * 3. Défaut : noir (#000000)
 */
export function getSectionColor(section: HTMLElement | null): string {
  if (!section) {
    return "#000000";
  }

  const dataColor = section.dataset.color?.trim();

  if (dataColor) {
    return dataColor;
  }

  const cssColor = getComputedStyle(section)
    .getPropertyValue("--section-color")
    .trim();

  return cssColor || "#000000";
}
