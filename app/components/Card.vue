<script setup lang="ts">
const {
  is = 'div',
  borderRadius = undefined,
  borderColor = undefined,
  backgroundColor = undefined,
  borderWidth = undefined,
  paddingBlock = '1.25rem',
  paddingInline = '1.5rem',
} = defineProps<{
  is?: string;
  borderWidth?: number;
  borderRadius?: BorderRadius;
  borderColor?: string;
  backgroundColor?: string;
  paddingBlock?: string;
  paddingInline?: string;
}>();

const computedStyle = computed(() => ({
  '--card-radius': borderRadius && `var(--radius-${borderRadius})`,
  '--card-border-color': borderColor && `var(--color-${borderColor})`,
  '--card-border-width': borderWidth && `${borderWidth}px`,
  '--card-padding-block': paddingBlock,
  '--card-padding-inline': paddingInline,
  '--card-background': backgroundColor && `var(--color-${backgroundColor})`,
}));
</script>

<template>
  <component :is="is" class="card" :style="computedStyle">
    <slot />
  </component>
</template>

<style>
:where(.card) {
  position: relative;
  background-color: var(--card-background, var(--color-card-bg));
  border: var(--card-border-width, 1px) solid var(--card-border-color);
  border-radius: var(--card-radius, var(--radius-lg));
  padding-block: var(--card-padding-block);
  padding-inline: var(--card-padding-inline);

  /* On a narrow screen the padding props give way. The padding itself is
     set, not the custom properties: those come from the inline style, which
     would win. */
  @media (max-width: 479px) {
    padding-block: 1.25rem;
    padding-inline: 1rem;
  }

  h1,
  h2,
  h3 {
    margin-block-start: 0;
  }
}
</style>
