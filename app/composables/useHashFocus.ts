/**
 * `focusHash()` focuses and scrolls to the element the address's hash names,
 * giving it `tabindex="-1"` when it cannot take focus, and returns whether
 * there was one. AppShell calls it after a navigation; a page whose content
 * arrives later calls it once that has rendered.
 */
export function useHashFocus() {
  const route = useRoute();

  function focusHash() {
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
