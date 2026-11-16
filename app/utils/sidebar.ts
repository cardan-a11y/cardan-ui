/** Where `useAppSidebar()` keeps whether the sidebar is collapsed in this browser. */
export const APP_SIDEBAR_STORAGE_KEY = 'isSidebarCollapsed';

/**
 * On `<html>` from the first paint of a server-rendered page until the app has
 * applied this browser's choice itself: the collapsed styles of AppSidebar
 * apply under it, so a collapsed sidebar does not open and close again on load.
 */
export const APP_SIDEBAR_COLLAPSED_HINT_CLASS = 'sidebar-collapsed-hint';

/**
 * An inline script for the head that sets `APP_SIDEBAR_COLLAPSED_HINT_CLASS`
 * before the body paints (VueUse stores the boolean as `'true'`). The same
 * for every visitor, so a cached page may carry it. A collapsible AppSidebar
 * adds it to the pages the server renders.
 */
export const appSidebarHintScript = `try{if(localStorage.getItem(${JSON.stringify(
  APP_SIDEBAR_STORAGE_KEY,
)})==='true')document.documentElement.classList.add(${JSON.stringify(
  APP_SIDEBAR_COLLAPSED_HINT_CLASS,
)})}catch(e){}`;
