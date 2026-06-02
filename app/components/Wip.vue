<template>
  <div class="wipWrapper">
    <p class="h1">
      Ce site est en cours de construction, encore un peu de patience ! 🚧
    </p>
    <!-- <div class="projets">
      <p>Voici quelques projets que j'ai pu réaliser en attendant...</p>
      <div class="projet"></div>
    </div> -->
  </div>
</template>

<script lang="ts" setup></script>

<style lang="scss">
.wipWrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  justify-content: center;
  height: 100%;
  gap: 50px;

  .h1 {
    font-size: clamp(1rem, 5vw, 2rem);
  }
}
</style>
