import { createVNode, render } from "vue";
import LinkTransitionProvider from "~/components/LinkTransitionProvider.vue";

export default defineNuxtPlugin((nuxtApp) => {
  if (document.getElementById("link-transition-provider-root")) {
    return;
  }

  const container = document.createElement("div");
  container.id = "link-transition-provider-root";
  document.body.appendChild(container);

  // Rendu hors de l'arbre de l'app : on lui donne son contexte pour que
  // useRouter() et useNuxtApp() fonctionnent dans le provider.
  const vnode = createVNode(LinkTransitionProvider);
  vnode.appContext = nuxtApp.vueApp._context;
  render(vnode, container);
});
