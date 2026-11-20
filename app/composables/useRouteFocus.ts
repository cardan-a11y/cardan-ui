import type { MaybeRefOrGetter } from 'vue';

/**
 * Moves focus to `target` after every navigation to another page, and when the
 * error page replaces the app or the app comes back, so keyboard and screen
 * reader users start at the top of the new page. AppShell does this for its
 * wrapper. Focus the new page moves into its `<main>` itself stays there; a
 * modal dialog still open over the new page is waited for until it closes. An
 * address with a hash focuses the element it names (`useHashFocus()`).
 */
export function useRouteFocus(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
) {
  const route = useRoute();
  const router = useRouter();
  const { focusHash } = useHashFocus();

  let focusBefore: Element | null = null;

  let stopWaiting = () => {};
  onScopeDispose(() => stopWaiting());

  if (import.meta.client) {
    const removeGuard = router.beforeEach(() => {
      focusBefore = document.activeElement;
    });
    onScopeDispose(removeGuard);
  }

  function pageMovedFocus(previous: Element | null) {
    const active = document.activeElement;

    return !!active && active !== previous && !!active.closest('main');
  }

  function blockedByDialog(element: HTMLElement) {
    const dialogs = Array.from(document.querySelectorAll('dialog[open]'));

    return (
      dialogs.length > 0 &&
      (!!element.closest('[inert]') ||
        dialogs.some(
          (dialog) => dialog.matches(':modal') && !dialog.contains(element),
        ))
    );
  }

  function focusTarget(previous: Element | null) {
    stopWaiting();

    const timeout = setTimeout(() => {
      const element = toValue(target);

      if (element && blockedByDialog(element)) {
        const onClose = () => focusTarget(document.activeElement);
        document.addEventListener('close', onClose, {
          capture: true,
          once: true,
        });
        stopWaiting = () =>
          document.removeEventListener('close', onClose, { capture: true });
        return;
      }

      if (pageMovedFocus(previous) || focusHash()) return;

      element?.focus();
    });
    stopWaiting = () => clearTimeout(timeout);
  }

  watch(
    () => route.path,
    () => focusTarget(focusBefore),
  );

  const isFirstRender = useNuxtApp().isHydrating;
  onMounted(() => {
    const isFirstPageOfVisit = isFirstRender && !window.history.state?.back;
    if (!isFirstPageOfVisit) focusTarget(null);
  });
}
