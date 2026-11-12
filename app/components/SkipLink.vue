<script setup lang="ts">
const { links = [{ href: '#main' }] } = defineProps<{
  links?: SkipLinkItem[];
}>();
</script>

<template>
  <template v-for="link in links" :key="link.href">
    <a :href="link.href" class="skip-link">
      {{ link.label || $t('aria.skip-to-main-content') }}
    </a>
  </template>
</template>

<style>
.skip-link {
  position: absolute;
  z-index: 9;
  inset-inline: 0;
  inset-block-start: 0;
  margin-inline: auto;
  width: max-content;
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-xs);
  background-color: var(--color-white);
  color: var(--color-text);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  transform: translateY(-100%);
  text-decoration-color: transparent;
  transition-property: color, background-color, transform;
  transition-duration: var(--duration-md);

  &:focus {
    outline: 2px solid var(--focus-color);
    outline-offset: -1px;
    transform: translateY(1rem);
  }
}
</style>
