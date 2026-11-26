import type { Ref } from 'vue';

/**
 * The popup of ComboBox and MultiComboBox, in the top layer while `isOpen`.
 * CSS anchor positioning places it; the one thing measured is for the
 * phone's keyboard, which iOS leaves out of the viewport CSS knows:
 * `keyboardInsets` keeps the popup out from under it, and a field it still
 * hides is scrolled into view.
 */
export function useComboBoxPopup(elements: {
  popup: Readonly<Ref<HTMLElement | null>>;
  control: Readonly<Ref<HTMLElement | null>>;
  input: Readonly<Ref<HTMLInputElement | null>>;
  isOpen: Readonly<Ref<boolean>>;
}) {
  const keyboardInsets = ref<{ top: number; bottom: number }>();

  let revealTimer: ReturnType<typeof setTimeout> | undefined;

  // Until iOS makes the layout viewport smaller for its keyboard: the part the
  // visual viewport leaves out becomes an inset of the list's room
  function trackViewport() {
    const viewport = window.visualViewport;

    if (!viewport || Math.abs(viewport.scale - 1) > 0.01) {
      keyboardInsets.value = undefined;
      return;
    }

    const visibleEnd = viewport.offsetTop + viewport.height;
    const top = Math.max(0, Math.round(viewport.offsetTop));
    const bottom = Math.max(
      0,
      Math.round(document.documentElement.clientHeight - visibleEnd),
    );

    keyboardInsets.value = top || bottom ? { top, bottom } : undefined;

    clearTimeout(revealTimer);
    if (keyboardInsets.value) revealTimer = setTimeout(revealField, 250);
  }

  // Until iOS always brings a focused field above its keyboard: one still out
  // of view once the keyboard has settled is centred there, as iOS does
  function revealField() {
    const viewport = window.visualViewport;
    const control = elements.control.value;

    if (
      !viewport ||
      !control ||
      document.activeElement !== elements.input.value
    ) {
      return;
    }

    // Client coordinates start at the layout viewport, or on iOS at what is
    // visible: an element fixed at the top tells which
    const probe = document.createElement('div');
    probe.style.cssText =
      'position: fixed; inset: 0 auto auto 0; visibility: hidden';
    document.body.append(probe);
    const visibleTop = probe.getBoundingClientRect().top + viewport.offsetTop;
    probe.remove();

    const box = control.getBoundingClientRect();
    if (box.top >= visibleTop && box.bottom <= visibleTop + viewport.height) {
      return;
    }

    scrollerOf(control)?.scrollBy(
      0,
      box.top - visibleTop - (viewport.height - box.height) / 2,
    );
  }

  function scrollerOf(element: Element) {
    for (
      let parent = element.parentElement;
      parent && parent !== document.body;
      parent = parent.parentElement
    ) {
      const style = getComputedStyle(parent);

      if (
        /auto|scroll/.test(style.overflowY) &&
        parent.scrollHeight > parent.clientHeight
      ) {
        return parent;
      }
      if (style.position === 'fixed') return undefined;
    }

    return window;
  }

  function untrackViewport() {
    clearTimeout(revealTimer);
    window.visualViewport?.removeEventListener('resize', trackViewport);
    window.visualViewport?.removeEventListener('scroll', trackViewport);
    keyboardInsets.value = undefined;
  }

  watch(
    elements.isOpen,
    (nowOpen) => {
      const popup = elements.popup.value;
      if (!popup) return;

      if (nowOpen) {
        if (!popup.matches(':popover-open')) popup.showPopover?.();
        window.visualViewport?.addEventListener('resize', trackViewport);
        window.visualViewport?.addEventListener('scroll', trackViewport);
        trackViewport();
      } else {
        if (popup.matches(':popover-open')) popup.hidePopover?.();
        untrackViewport();
      }
    },
    { flush: 'post' },
  );

  onBeforeUnmount(untrackViewport);

  /** The insets as the custom properties the popup's CSS reads */
  const insetStyle = computed(
    () =>
      keyboardInsets.value && {
        '--combobox-inset-top': `${keyboardInsets.value.top}px`,
        '--combobox-inset-bottom': `${keyboardInsets.value.bottom}px`,
      },
  );

  return { insetStyle };
}
