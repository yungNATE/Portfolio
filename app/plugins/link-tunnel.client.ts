import { createVNode, render } from "vue";
import LinkTunnelProvider from "~/components/LinkTunnelProvider.vue";

export default defineNuxtPlugin(() => {
  if (!process.client) {
    return;
  }

  if (document.getElementById("link-tunnel-provider-root")) {
    return;
  }

  const container = document.createElement("div");
  container.id = "link-tunnel-provider-root";
  document.body.appendChild(container);

  render(createVNode(LinkTunnelProvider), container);
});
