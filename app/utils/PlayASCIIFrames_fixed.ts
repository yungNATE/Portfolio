/**
 * PlayASCIIFrames - Micro-librairie pour afficher une animation ASCII
 * Inspirée par ascii-animation.html
 */

export interface PlayASCIIFramesOptions {
  fps?: number;
  element?: HTMLElement | null;
}

export interface PlayASCIIFramesInstance {
  play: () => void;
  pause: () => void;
  stop: () => void;
  dispose: () => void;
  setFPS: (fps: number) => void;
}

/**
 * Crée une instance de lecteur d'animation ASCII
 * @param frames - Tableau des frames ASCII à afficher
 * @param options - Options de configuration
 * @returns Instance du lecteur
 */
export function PlayASCIIFrames(
  frames: string[],
  options: PlayASCIIFramesOptions = {},
): PlayASCIIFramesInstance {
  const { fps = 16, element = null } = options;

  let currentFrame = 0;
  let animationInterval: ReturnType<typeof setInterval> | null = null;
  let isPlaying = false;
  let currentFPS = fps;
  let targetElement = element;

  /**
   * Affiche un frame spécifique
   */
  const displayFrame = (index: number): void => {
    if (!targetElement || frames.length === 0) return;
    targetElement.textContent = frames[index] ?? "";
  };

  /**
   * Lance l'animation
   */
  const play = (): void => {
    if (isPlaying || !targetElement || frames.length === 0) return;

    isPlaying = true;
    displayFrame(0);

    animationInterval = setInterval(() => {
      currentFrame = (currentFrame + 1) % frames.length;
      displayFrame(currentFrame);
    }, 1000 / currentFPS);
  };

  /**
   * Met en pause l'animation
   */
  const pause = (): void => {
    if (!isPlaying) return;
    isPlaying = false;
    if (animationInterval !== null) {
      clearInterval(animationInterval);
      animationInterval = null;
    }
  };

  /**
   * Arrête et réinitialise l'animation
   */
  const stop = (): void => {
    pause();
    currentFrame = 0;
    if (targetElement) {
      targetElement.textContent = "";
    }
  };

  /**
   * Définit le FPS (frames par seconde)
   */
  const setFPS = (newFPS: number): void => {
    currentFPS = newFPS;
    if (isPlaying) {
      pause();
      play();
    }
  };

  /**
   * Nettoie et libère les ressources
   */
  const dispose = (): void => {
    stop();
    targetElement = null;
  };

  /**
   * Définit l'élément cible
   */
  const setElement = (el: HTMLElement | null): void => {
    targetElement = el;
  };

  return {
    play,
    pause,
    stop,
    dispose,
    setFPS,
  };
}

export default PlayASCIIFrames;
