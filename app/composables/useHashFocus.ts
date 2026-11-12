/**
 * Focuses the element the address's hash names (`/report/1#non-text-content`),
 * as a browser brings it into view for a page it loads: at the top, below
 * what sticks there (the scroll padding), and focused as well, so a keyboard
 * or screen reader user starts there. An element that cannot take focus gets
 * `tabindex="-1"` for it.
 *
 * AppShell does this after a navigation when the element is on the new page
 * already. A page whose content arrives later calls `focusHash()` once it has
 * rendered it; it returns whether there was an element to focus, so the page
 * can focus something else instead.
 */
export function useHashFocus() {
  const route = useRoute();

  function focusHash() {
    // vue-router has decoded it already
    const id = route.hash.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return false;

    if (target.tabIndex < 0 && !target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
    }

    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start' });

    return true;
  }

  return { focusHash };
}
