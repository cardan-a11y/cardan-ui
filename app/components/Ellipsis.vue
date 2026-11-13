<script setup lang="ts">
/**
 * Text clamped to `lines` lines, with an ellipsis at the end. The clipped
 * part is only hidden visually: a link or button in it stays in the tab order
 * and a screen reader reads all of it. So keep interactive content out of a
 * clamped text, or give the reader a way to the whole text.
 */
const { is = 'span', lines = 1 } = defineProps<{
  lines?: number;
  is?: string;
}>();
</script>

<template>
  <component
    :is="is"
    :class="[
      'ellipsis',
      'ellipsis-variant--clamp',
      lines === 1 && 'ellipsis--1-line',
    ]"
    :style="{ '--ellipsis-line-clamp': lines }"
  >
    <slot mdc-unwrap="p" />
  </component>
</template>

<style>
.ellipsis {
  overflow: hidden;
  display: block;
}

.ellipsis--1-line {
  word-break: break-all;
}

.ellipsis-variant--clamp {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--ellipsis-line-clamp);
  line-clamp: var(--ellipsis-line-clamp);
  -webkit-hyphens: none;
  hyphens: none;
}
</style>
