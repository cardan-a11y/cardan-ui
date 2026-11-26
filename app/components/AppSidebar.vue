<script setup lang="ts">
/**
 * The app's sticky side navigation: a labelled `aside` with the logo or a
 * title in `header` and the navigation, which scrolls on its own, in the
 * default slot. `collapsible` adds a button that folds it to a rail of icons,
 * a choice kept in the browser (`useAppSidebar()`); the app styles the rest
 * under `.app-sidebar.is-collapsed`. The app hides it with
 * `--app-sidebar-display: none` and sizes it with `--app-sidebar-top`,
 * `--app-sidebar-padding-inline`, `--app-sidebar-padding-block`,
 * `--app-sidebar-width`, `--app-sidebar-collapsed-width` and
 * `--app-sidebar-border-color`. The navigation keeps at least
 * `--app-sidebar-scrollbar-room` (0.75rem) at its inline end, where an overlay
 * scrollbar (macOS, phones) would cover its links; a wider
 * `--app-sidebar-padding-inline` holds it already.
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

const accessibleName = computed(() => label || $t('aria.sidebar'));

// The stored choice before the first paint, by a script that is the same for
// every visitor, so a cached page may carry it
if (import.meta.server && collapsible) {
  useHead({
    script: [{ key: 'app-sidebar-hint', innerHTML: appSidebarHintScript }],
  });
}
</script>

<template>
  <aside
    :id="id"
    :aria-label="accessibleName"
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
        <span class="visuallyhidden">{{ accessibleName }}</span>
      </button>
    </div>
  </aside>
</template>

<style>
.app-sidebar {
  display: var(--app-sidebar-display, grid);
  grid-template-rows: auto minmax(0, 1fr) auto;
  grid-template-areas: 'header' 'content' 'footer';
  inline-size: var(--app-sidebar-width, 16.25rem);
  border-inline-end: 1px solid
    var(--app-sidebar-border-color, var(--color-grey-light));
  overflow-x: clip;
  transition: inline-size var(--duration-lg);

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

.app-sidebar > :first-child {
  padding-block-start: var(--app-sidebar-padding-block, 0px);
}

.app-sidebar > :last-child {
  padding-block-end: var(--app-sidebar-padding-block, 0px);
}

.app-sidebar > .app-sidebar-header:first-child {
  padding-block-start: calc(var(--app-sidebar-padding-block, 0px) + 0.5rem);
}

.app-sidebar-header,
.app-sidebar-content,
.app-sidebar-footer {
  padding-inline: var(--app-sidebar-padding-inline, 0);
}

.app-sidebar-content {
  grid-area: content;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-inline-end: max(
    var(--app-sidebar-padding-inline, 0px),
    var(--app-sidebar-scrollbar-room, 0.75rem)
  );
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

  &:focus-visible {
    outline: 2px solid var(--focus-color);
    outline-offset: -2px;
  }
}

.app-sidebar.is-collapsible .app-sidebar-content {
  white-space: nowrap;

  .button-text {
    transition: opacity var(--duration-md);
  }
}

/* The hint: a folded choice before hydration (useAppSidebar) */
.app-sidebar.is-collapsed,
:root.sidebar-collapsed-hint .app-sidebar.is-collapsible {
  inline-size: var(--app-sidebar-collapsed-width, 3.5rem);

  .app-sidebar-content {
    scrollbar-width: none;
    /* No scrollbar to make room for: the icons stay centred */
    padding-inline-end: var(--app-sidebar-padding-inline, 0px);

    /* Not `display: none`: still the name of its link or button */
    .button-text {
      opacity: 0;
    }
  }
}
</style>
