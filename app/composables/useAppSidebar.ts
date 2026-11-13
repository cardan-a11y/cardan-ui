import { useStorage } from '@vueuse/core';

/**
 * Whether the app's sidebar (AppSidebar) is collapsed, kept in this browser.
 * A layout reads it to follow the sidebar, for a class of its own.
 */
export function useAppSidebar() {
  // A page hydrated from server HTML never knows this browser's choice: read
  // it after mounting there, or the classes would not match. Until then the
  // hint class shows the choice (`appSidebarHintScript`); it goes once the
  // class it stands in for is on the sidebar. A single-page app renders in
  // the browser from an empty shell: Nuxt counts its first render as
  // hydrating too, but there is nothing to match and no hint, so it reads the
  // choice right away and opens with it, instead of opening wide and sliding
  // shut.
  const nuxtApp = useNuxtApp();
  const isHydrating =
    import.meta.server ||
    (nuxtApp.isHydrating && !!nuxtApp.payload.serverRendered);

  const isCollapsed = useStorage(APP_SIDEBAR_STORAGE_KEY, false, undefined, {
    initOnMounted: isHydrating,
  });

  if (isHydrating) {
    onMounted(() =>
      nextTick(() =>
        document.documentElement.classList.remove(
          APP_SIDEBAR_COLLAPSED_HINT_CLASS,
        ),
      ),
    );
  }

  function toggle() {
    isCollapsed.value = !isCollapsed.value;
  }

  return {
    isCollapsed,
    toggle,
  };
}
