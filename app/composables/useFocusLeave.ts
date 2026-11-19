/**
 * Closes a popover when focus leaves it for the page: when it moves from its
 * trigger or its content to an element outside both. A move between the two
 * keeps it open, and so does a move to nowhere (the window loses focus).
 *
 * A press inside moves focus too, and that is platform behaviour, not a
 * leave: the default action of a mousedown on content that cannot take focus
 * (text, padding) focuses the nearest focusable element around it, such as a
 * `<main tabindex="-1">` or the AppShell, and Safari, where a click does not
 * focus a button, does the same for a press on the trigger. `onPress`, on the
 * mousedown, marks such a move until the next task; the popover then stays
 * open and closes when focus leaves the element the press gave it to for the
 * page, as it does after a navigation when AppShell focuses the shell. A
 * press on the trigger so closes it with the click, instead of on mousedown
 * for the click to open it again.
 *
 * - `elements`: the trigger and the content.
 * - `close`: closes the popover.
 * - `isOpen`: when given, a focus move while it is false does nothing.
 *
 * Bind `onFocusOut` to the `focusout` of the trigger and the content, and
 * `onPress` to the `mousedown` of each that a press should not close it
 * from. Call `unpark()` when the popover closes; it is also called on unmount.
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

  /** The element around the popover that a press in it gave focus to */
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
