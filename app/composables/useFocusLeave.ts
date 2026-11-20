/**
 * Closes a popover when focus leaves its trigger and content for the page; a
 * move between the two, or out of the window, keeps it open. A press inside
 * that moves focus to an element around it (platform behaviour, not a leave)
 * keeps it open until focus leaves that element.
 *
 * Bind `onFocusOut` to the `focusout` of the trigger and the content, and
 * `onPress` to the `mousedown` of each that a press should not close it from.
 * Call `unpark()` when the popover closes. `isOpen`: a focus move while it is
 * false does nothing.
 */
export function useFocusLeave({
  elements,
  close,
  isOpen,
}: {
  elements: () => (Element | null | undefined)[];
  close: () => void;
  isOpen?: () => boolean;
}) {
  let pressedInside = false;

  function onPress() {
    pressedInside = true;
    setTimeout(() => {
      pressedInside = false;
    });
  }

  let parked: Element | null = null;

  function unpark() {
    parked?.removeEventListener('focusout', onFocusOut);
    parked = null;
  }

  function onFocusOut(event: Event) {
    const next = (event as FocusEvent).relatedTarget;
    if ((isOpen && !isOpen()) || !(next instanceof Element)) return;

    if (elements().some((element) => element?.contains(next))) {
      unpark();
      return;
    }

    if (pressedInside) {
      unpark();
      parked = next;
      next.addEventListener('focusout', onFocusOut);
      return;
    }

    close();
  }

  onBeforeUnmount(unpark);

  return { onPress, onFocusOut, unpark };
}
