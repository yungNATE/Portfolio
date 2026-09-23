// À placer dans composables/ (Nuxt 3) ou app/composables/ (Nuxt 4).

import { onBeforeUnmount, onMounted, ref, type Ref } from "vue";

/**
 * Expose isVisible : true tant que `el` intersecte le viewport (+ marge).
 * rootMargin élargit la zone de détection pour anticiper l'entrée en vue
 * plutôt que de déclencher l'effet pile au bord de l'écran.
 */
export function useInViewport(
  el: Ref<HTMLElement | null>,
  rootMargin = "200px",
) {
  const isVisible = ref(false);
  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    if (!el.value) return;
    observer = new IntersectionObserver(
      ([entry]) => {
        isVisible.value = entry?.isIntersecting ?? false;
      },
      { rootMargin },
    );
    observer.observe(el.value);
  });

  onBeforeUnmount(() => observer?.disconnect());

  return { isVisible };
}
