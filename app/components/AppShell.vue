<script setup lang="ts">
/**
 * The wrapper of an app's header, navigation and pages: it announces a new
 * page, puts the skip link first and takes focus after a navigation
 * (`useRouteFocus()`). A page has exactly one focusable `id="main"`
 * (`tabindex="-1"`) past all repeated content (WCAG 2.4.1), unless
 * `skip-links` name another. It has no layout of its own.
 */
const { skipLinks = undefined } = defineProps<{
  skipLinks?: SkipLinkItem[];
}>();

const shellRef = useTemplateRef<HTMLDivElement>('shell');

useRouteFocus(shellRef);
</script>

<template>
  <div ref="shell" tabindex="-1" class="app-shell">
    <NuxtRouteAnnouncer />

    <SkipLink :links="skipLinks" />

    <slot />
  </div>
</template>

<style>
/* No focus ring for focus a navigation put here; an outline in forced colors */
.app-shell {
  outline: 1px solid transparent;
}
</style>
