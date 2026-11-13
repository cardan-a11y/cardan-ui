<script setup lang="ts">
/**
 * The app's side navigation: a labelled `aside` that stays in view while the
 * page scrolls, with the logo or a title in `header` and the navigation in
 * the default slot, which scrolls on its own when it is taller than the
 * viewport.
 *
 * With `collapsible` a button at the bottom folds it to a rail of icons. The
 * choice is kept in the browser (`useAppSidebar()`), and a server-rendered
 * page opens with it from the first paint. Folded, the text of the buttons
 * and links in it is hidden from view only; what else changes (a logo that
 * becomes its symbol) is the app's, under `.app-sidebar.is-collapsed`.
 *
 * It does not hide itself: below the width where the app's menu takes over,
 * the app sets `--app-sidebar-display: none`. Next to a header that spans the
 * page instead of sitting beside it, `--app-sidebar-top` is the header's
 * height. It has no padding of its own: the app gives it
 * `--app-sidebar-padding-inline` and `--app-sidebar-padding-block`, next to
 * `--app-sidebar-width`, `--app-sidebar-collapsed-width` and
 * `--app-sidebar-border-color`.
 */
const {
  id = 'app-sidebar',
  label = undefined,
  collapsible = false,
} = defineProps<{
  id?: string;
  label?: string;
  collapsible?: boolean;
}>();

const { isCollapsed, toggle } = useAppSidebar();

/** Of the landmark, and of the button that folds it */
const name = computed(() => label || $t('aria.sidebar'));

// The server knows nothing of this browser's choice: this script puts it on
// `<html>` before the first paint, so the page does not open wide and slide
// shut. The same for every visitor, so a cached page may carry it.
if (import.meta.server && collapsible) {
  useHead({
    script: [{ key: 'app-sidebar-hint', innerHTML: appSidebarHintScript }],
  });
}
</script>

<template>
  <aside
    :id="id"
    :aria-label="name"
    :class="[
      'app-sidebar',
      collapsible && 'is-collapsible',
      collapsible && isCollapsed && 'is-collapsed',
    ]"
  >
    <div v-if="$slots.header" class="app-sidebar-header">
      <slot name="header" />
    </div>

    <div class="app-sidebar-content">
      <slot />
    </div>

    <div v-if="collapsible" class="app-sidebar-footer">
      <button
        type="button"
        class="app-sidebar-toggle"
        :aria-controls="id"
        :aria-expanded="!isCollapsed"
        @click="toggle"
      >
        <Icon name="material-symbols:dock-to-right-outline-rounded" />
        <span class="visuallyhidden">{{ name }}</span>
      </button>
    </div>
  </aside>
</template>

<style>
.app-sidebar {
  display: var(--app-sidebar-display, grid);
  /* By name: without a header the navigation still takes the remaining
     height, the row that scrolls */
  grid-template-rows: auto minmax(0, 1fr) auto;
  grid-template-areas: 'header' 'content' 'footer';
  inline-size: var(--app-sidebar-width, 16.25rem);
  border-inline-end: 1px solid
    var(--app-sidebar-border-color, var(--color-grey-light));
  /* Folded, it cuts its content off at the rail */
  overflow-x: clip;
  transition: inline-size var(--duration-lg);

  /* While the header sticks (AppHeader); on a low screen it scrolls along */
  @media (min-width: 360px) and (min-height: 480px) {
    position: sticky;
    top: var(--app-sidebar-top, 0px);
    height: calc(100dvh - var(--app-sidebar-top, 0px));
  }
}

.app-sidebar-header {
  grid-area: header;
  display: flex;
}

/* The app's block padding is the outer parts' own: inside the area that
   scrolls where the navigation is first or last, so nothing in it is cut
   off above or below that padding */
.app-sidebar > :first-child {
  padding-block-start: var(--app-sidebar-padding-block, 0px);
}

.app-sidebar > :last-child {
  padding-block-end: var(--app-sidebar-padding-block, 0px);
}

.app-sidebar > .app-sidebar-header:first-child {
  padding-block-start: calc(var(--app-sidebar-padding-block, 0px) + 0.5rem);
}

/* The app's inline padding is each part's own, so the navigation's is
   inside the box that scrolls: the focus outlines of its links have room in
   the box that clips them, and the scrollbar sits at the sidebar's edge. */
.app-sidebar-header,
.app-sidebar-content,
.app-sidebar-footer {
  padding-inline: var(--app-sidebar-padding-inline, 0);
}

/* The navigation scrolls between the header and the button, down only: it
   never scrolls sideways, also not while the sidebar folds or unfolds. */
.app-sidebar-content {
  grid-area: content;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.app-sidebar-footer {
  grid-area: footer;
  display: flex;
  padding-block-start: 0.5rem;
}

.app-sidebar-toggle {
  cursor: pointer;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text);
  background-color: transparent;
  transition: background-color var(--duration-sm);

  .iconify {
    font-size: var(--font-size-lg);
  }

  &:hover {
    background-color: var(--color-grey-bg);
  }

  /* Inside the button: the sidebar clips at its edge, and it may have no
     padding there */
  &:focus-visible {
    outline: 2px solid var(--focus-color);
    outline-offset: -2px;
  }
}

/* Its labels stay on one line, folded, unfolded and in between: they slide
   out of view at the edge instead of wrapping into the narrowing column, and
   fade in once there is room again */
.app-sidebar.is-collapsible .app-sidebar-content {
  white-space: nowrap;

  .button-text {
    transition: opacity var(--duration-md);
  }
}

/* Folded to a rail of icons. The hint applies a folded choice before the app
   does, on a page the server rendered (useAppSidebar). */
.app-sidebar.is-collapsed,
:root.sidebar-collapsed-hint .app-sidebar.is-collapsible {
  inline-size: var(--app-sidebar-collapsed-width, 3.5rem);

  .app-sidebar-content {
    /* No scrollbar in the rail's width: the list still scrolls */
    scrollbar-width: none;

    /* Out of view, still the name of its link or button */
    .button-text {
      opacity: 0;
    }
  }
}
</style>
