<template>
  <div class="wip-notice" role="status">
    <span class="wip-notice__icon" aria-hidden="true">🚧</span>
    <span class="wip-notice__text"
      ><slot>Ce site en cours de développement</slot></span
    >
  </div>
</template>

<style scoped>
.wip-notice {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: rgba(255, 180, 0, 0.12);
  border: 1px solid rgba(255, 180, 0, 0.35);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);

  position: absolute;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
}

.is-portrait .wip-notice {
  position: static;
  transform: none;
}
</style>
