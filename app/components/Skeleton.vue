<script setup lang="ts">
/**
 * A placeholder for content that is still loading: a bar or a circle with a
 * shimmer or a pulse. It is decorative, hidden from assistive technology; the
 * element whose content it stands in for carries `aria-busy="true"` while
 * that loads, as Table does for its rows.
 */
const {
  size = 'md',
  width = '100%',
  radius = 'sm',
  animation = 'shimmer',
  variant = undefined,
} = defineProps<{
  size?: string;
  width?: string;
  radius?: string;
  variant?: 'default' | 'circle';
  animation?: string;
}>();

const computedStyle = computed(() => ({
  '--skeleton-size': `var(--size-${size})`,
  '--skeleton-width': width,
  '--skeleton-radius': radius && `var(--radius-${radius})`,
}));
</script>

<template>
  <div
    :class="[
      'skeleton',
      `skeleton-animation--${animation}`,
      variant && `skeleton-variant--${variant}`,
    ]"
    :style="computedStyle"
    aria-hidden="true"
  />
</template>

<style>
.skeleton {
  width: var(--skeleton-width, 100%);
  height: var(--skeleton-size);
  border-radius: var(--skeleton-radius, var(--radius-sm));
  background-color: var(--color-grey-bg);
}

.skeleton-variant--circle {
  border-radius: var(--radius-full);
  width: var(--skeleton-size);
}

.skeleton-animation--pulse {
  animation: pulse var(--duration-xl) cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.skeleton-animation--shimmer {
  --skeleton-color-1: var(--color-grey-bg);
  --skeleton-color-2: var(--color-grey-light);
  animation: shimmer var(--duration-xl) linear infinite;
  background: linear-gradient(
    -45deg,
    var(--skeleton-color-1) 30%,
    var(--skeleton-color-2) 45%,
    var(--skeleton-color-2) 55%,
    var(--skeleton-color-1) 70%
  );
  background-size: 400% 400%;
}

@keyframes pulse {
  50% {
    opacity: 0.5;
  }
}

@keyframes shimmer {
  0% {
    background-position: 100% 100%;
  }
  100% {
    background-position: 0% 0%;
  }
}
</style>
