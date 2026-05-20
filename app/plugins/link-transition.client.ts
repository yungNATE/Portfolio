import { createVNode, render } from "vue";
import LinkTransitionProvider from "~/components/LinkTransitionProvider.vue";

export default defineNuxtPlugin(() => {
  if (document.getElementById("link-tunnel-provider-root")) {
    return;
  }

  const container = document.createElement("div");
  container.id = "link-transition-provider-root";
  document.body.appendChild(container);

  render(createVNode(LinkTransitionProvider), container);
});
