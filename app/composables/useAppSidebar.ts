import { useStorage } from '@vueuse/core';

/**
 * Whether the app's sidebar (AppSidebar) is collapsed, kept in this browser.
 * A layout reads it to follow the sidebar, for a class of its own.
 */
export function useAppSidebar() {
  // The server cannot read localStorage: hydrating server HTML reads it after
  // mount, with the hint class (`appSidebarHintScript`) showing it until then.
  const nuxtApp = useNuxtApp();
  const rendersServerHtml =
    import.meta.server ||
    (nuxtApp.isHydrating && !!nuxtApp.payload.serverRendered);

  const isCollapsed = useStorage(APP_SIDEBAR_STORAGE_KEY, false, undefined, {
    initOnMounted: rendersServerHtml,
  });

  if (rendersServerHtml) {
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
