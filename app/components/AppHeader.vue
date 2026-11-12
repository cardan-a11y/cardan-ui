<script setup lang="ts">
/**
 * The frame of an app's header: a bar that stays at the top of the viewport,
 * with the page loading indicator. `start` holds the menu button and the
 * logo, the default slot the navigation, `end` what sits at the far side
 * (the user menu, a theme switch).
 *
 * Its height is `--app-header-height` plus its 1px line, which is where
 * everything sticky below it starts (AppSidebar, SidebarLayout). What the
 * app keeps sticky right under it, a navigation bar or a toolbar, it sets as
 * `--app-header-sticky-below` on `:root` while that sticks: keyboard focus
 * then stops below both, and SidebarLayout's panel starts under both. The
 * look is the app's: `--app-header-bg`, `--app-header-border-color`,
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
  /* Never wider than the viewport in an app's grid: its items shrink */
  min-width: 0;
  border-block-end: 1px solid
    var(--app-header-border-color, var(--color-grey-bg));
  background-color: var(--app-header-bg, var(--color-white));

  /* On a small or low screen, or zoomed in, it scrolls along and leaves the
     room to the page. What sticks below it uses the same condition. */
  @media (min-width: 360px) and (min-height: 480px) {
    position: sticky;
    /* Above the page's own sticky parts (1) and a navigation bar under the
       header (2), so a menu that opens from the header covers them */
    z-index: 3;
    top: 0;
  }
}

/* While it sticks, the browser stops a focused element below it and below
   what sticks under it, with the template's 2rem room above: keyboard focus
   never hides under the header (WCAG 2.4.11). A project's own header of the
   same class is left alone. */
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
