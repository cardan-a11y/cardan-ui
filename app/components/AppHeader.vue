<script setup lang="ts">
/**
 * The app's header bar, sticky, with the page loading indicator. `start` holds
 * the menu button and logo, the default slot the navigation, `end` the far
 * side. A bar the app keeps sticky under it sets its height as
 * `--app-header-sticky-below` on `:root` while it sticks (MIGRATION.md, 2.5).
 * The look: `--app-header-bg`, `--app-header-border-color`,
 * `--app-header-max-width` and `--app-header-gap`.
 */
</script>

<template>
  <header class="app-header">
    <div class="app-header-content">
      <slot name="start" />

      <slot />

      <div v-if="$slots.end" class="app-header-end">
        <slot name="end" />
      </div>
    </div>

    <NuxtLoadingIndicator
      color="var(--color-accent-graphic)"
      error-color="var(--color-red)"
    />
  </header>
</template>

<style>
.app-header {
  position: relative;
  min-width: 0;
  border-block-end: 1px solid
    var(--app-header-border-color, var(--color-grey-bg));
  background-color: var(--app-header-bg, var(--color-white));

  @media (min-width: 360px) and (min-height: 480px) {
    position: sticky;
    /* Above the page's sticky parts (1) and a bar under the header (2) */
    z-index: 3;
    top: 0;
  }
}

@media (min-width: 360px) and (min-height: 480px) {
  :root:has(.app-header > .app-header-content) {
    scroll-padding-block-start: calc(
      var(--app-header-height) + 1px + var(--app-header-sticky-below, 0px) +
        2rem
    );
  }
}

.app-header-content {
  display: flex;
  align-items: center;
  gap: var(--app-header-gap, 0.5rem);
  max-width: var(--app-header-max-width, var(--app-max-width));
  min-height: var(--app-header-height);
  margin-inline: auto;
  padding-inline: var(--app-padding-inline);
}

.app-header-end {
  display: flex;
  align-items: center;
  gap: var(--app-header-gap, 0.5rem);
  margin-inline-start: auto;
}
</style>
