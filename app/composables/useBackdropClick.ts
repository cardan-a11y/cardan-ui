/**
 * A click on a modal `<dialog>`'s backdrop, for Dialog and MobileMenu. The
 * dialog element is the panel too (its padding, a side dialog's space below
 * the content), and a press in the panel released over the backdrop, such as
 * while selecting text in a field, targets the dialog as their common
 * ancestor. So a click counts only when its press and its release are both
 * outside the dialog's box.
 */
export function useBackdropClick(onBackdropClick: () => void) {
  let pressedOutside = false;

  function isOutside(event: MouseEvent) {
    const dialog = event.currentTarget as HTMLDialogElement;
    if (event.target !== dialog) return false;

    const { left, right, top, bottom } = dialog.getBoundingClientRect();
    return (
      event.clientX < left ||
      event.clientX > right ||
      event.clientY < top ||
      event.clientY > bottom
    );
  }

  function onPointerdown(event: PointerEvent) {
    pressedOutside = isOutside(event);
  }

  function onClick(event: MouseEvent) {
    const fromOutside = pressedOutside;
    pressedOutside = false;

    if (fromOutside && isOutside(event)) onBackdropClick();
  }

  return { onPointerdown, onClick };
}
