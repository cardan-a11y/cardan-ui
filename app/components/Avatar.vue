<script setup lang="ts">
const {
  src = undefined,
  size = undefined,
  fontSize = undefined,
  initials = undefined,
} = defineProps<{
  src?: string;
  size?: string;
  fontSize?: FontSize;
  initials?: string;
}>();

const computedStyle = computed(() => ({
  '--avatar-size': `${size || '2.5rem'}`,
  '--avatar-font-size': fontSize && `var(--font-size-${fontSize})`,
}));
</script>

<template>
  <span class="avatar-wrapper" :style="computedStyle">
    <img
      v-if="src"
      :src="src"
      alt=""
      class="avatar-image"
      :style="computedStyle"
    />

    <span v-else class="avatar">
      <span class="avatar-initials">{{ initials }}</span>
    </span>
  </span>
</template>

<style>
.avatar-wrapper {
  width: var(--avatar-size);
  height: var(--avatar-size);
  font-size: var(--avatar-font-size, var(--font-size-md));
  border: 1px solid var(--avatar-border-color, transparent);
  border-radius: var(--radius-full);
  overflow: clip;
  display: grid;
  place-items: center;
  font-weight: var(--font-weight-semibold);
  background-color: var(--color-grey-light);
  color: var(--color-grey-text);
  flex-shrink: 0;
  transition:
    color var(--duration-sm),
    background-color var(--duration-sm);
}

.avatar-image {
  height: 100%;
}
</style>
