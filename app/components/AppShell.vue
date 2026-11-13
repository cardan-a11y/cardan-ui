<script setup lang="ts">
/**
 * The wrapper every app renders its header, navigation and pages in. It
 * announces a new page to screen readers, puts the skip link first and takes
 * focus after a navigation (`useRouteFocus()`), so the next Tab is the skip
 * link. The skip link's target is exactly one focusable `id="main"`
 * (`tabindex="-1"`) per page, past all repeated content (WCAG 2.4.1): the
 * app's `<main>`, or the page's own content after what repeats from page to
 * page, such as breadcrumbs or tabs; or the links name another one.
 *
 * It has no layout of its own: a class on it lays out what is in it.
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
/* Focus lands here after a navigation, not because the user moved it: no
   ring around the whole page, but an outline in forced colors. */
.app-shell {
  outline: 1px solid transparent;
}
</style>
