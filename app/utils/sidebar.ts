/** Where `useAppSidebar()` keeps whether the sidebar is collapsed in this browser. */
export const APP_SIDEBAR_STORAGE_KEY = 'isSidebarCollapsed';

/** On `<html>` until hydration: AppSidebar's collapsed styles apply under it, so it does not flash open. */
export const APP_SIDEBAR_COLLAPSED_HINT_CLASS = 'sidebar-collapsed-hint';

/** A head script that sets the hint class before the body paints; the same for every visitor. */
export const appSidebarHintScript = `try{if(localStorage.getItem(${JSON.stringify(
  APP_SIDEBAR_STORAGE_KEY,
)})==='true')document.documentElement.classList.add(${JSON.stringify(
  APP_SIDEBAR_COLLAPSED_HINT_CLASS,
)})}catch(e){}`;
