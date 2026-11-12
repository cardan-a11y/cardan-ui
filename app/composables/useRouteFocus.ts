import type { MaybeRefOrGetter } from 'vue';

/**
 * Moves focus to an element, the app's wrapper, after every navigation to
 * another page: a keyboard or screen reader user then starts at the top of
 * the new page, with the skip link as the next stop, instead of on a link of
 * the page that is gone. AppShell does this for its own wrapper.
 */
export function useRouteFocus(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
) {
  const route = useRoute();

  function focusTarget() {
    // After the new page has rendered. A field that page focuses because it
    // asks for it keeps focus: the code of a second factor after signing in.
    setTimeout(() => {
      if (document.activeElement?.matches('[autofocus]')) return;

      toValue(target)?.focus();
    });
  }

  // The path alone: a changed query or hash is the same page
  watch(() => route.path, focusTarget);

  // Arriving from a page in another layout mounts the wrapper anew and the
  // watcher does not fire: focus the same way. Not on the first page of a
  // visit, where the browser starts at the top; a reload of a later page
  // keeps its history state and counts as arriving.
  onMounted(() => {
    if (window.history.state?.back) focusTarget();
  });
}
