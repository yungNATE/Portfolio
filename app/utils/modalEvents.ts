/**
 * Événements globaux (sur window) qui ferment les modales ouvertes.
 *
 * - MODAL_CLOSE_EVENT : demande de fermeture, déclenchable de n'importe où.
 * - PAGE_TRANSITION_START_EVENT : émis par LinkTransitionProvider au début
 *   d'un changement de page. Un <dialog> en showModal() est dans le top layer,
 *   au-dessus de l'overlay quel que soit son z-index : il doit se fermer.
 */
export const MODAL_CLOSE_EVENT = "modal:close";
export const PAGE_TRANSITION_START_EVENT = "page-transition:start";

export const MODAL_AUTO_CLOSE_EVENTS = [
  MODAL_CLOSE_EVENT,
  PAGE_TRANSITION_START_EVENT,
] as const;

export function requestModalClose() {
  window.dispatchEvent(new Event(MODAL_CLOSE_EVENT));
}
