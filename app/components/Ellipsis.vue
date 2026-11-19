<script setup lang="ts">
/**
 * Text clamped to `lines` lines. The clipped part is hidden only visually:
 * keep links and buttons out of it, or give the reader a way to the whole text.
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
