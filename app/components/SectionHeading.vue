<script setup lang="ts">
// Shared heading of each section: small eyebrow above the main title
withDefaults(
  defineProps<{
    eyebrow: string;
    level?: 1 | 2 | 3;
    id?: string;
  }>(),
  { level: 2 },
);
</script>

<template>
  <header class="section-heading">
    <p class="section-heading__eyebrow">{{ eyebrow }}</p>
    <component :is="`h${level}`" :id="id" class="section-title">
      <slot />
    </component>
  </header>
</template>

<style lang="scss" scoped>
.section-heading {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}

.section-heading__eyebrow {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  opacity: 0.75;
}
</style>
