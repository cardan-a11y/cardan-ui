/**
 * A dialog opened from another component, held under a key: every caller of
 * one key shares the dialog's ref. Works for anything that exposes
 * `openDialog()` and `closeDialog()`: Dialog, and MobileMenu
 * (`useDialog<MobileMenuComponent>('menu')`).
 *
 * ```ts
 * // In the dialog's own component: <Dialog ref="dialogRef" …>
 * const { dialogRef, close } = useDialog('audit');
 *
 * // Anywhere else
 * const { open } = useDialog('audit');
 * ```
 *
 * Mount one dialog per key. Any string is a key until a project lists its
 * own, which makes a typo a type error (the layers' keys stay valid):
 *
 * ```ts
 * declare global {
 *   interface DialogKeys {
 *     audit: true;
 *     finding: true;
 *   }
 * }
 * export {};
 * ```
 *
 * For a dialog that asks "are you sure?", use `useConfirm()` instead.
 */
export function useDialog<T extends OpenableDialog = DialogComponent>(
  key: DialogKey,
) {
  const state = useState<T | null>(`cardan-ui:dialog:${key}`, () => null);

  /** Bind it as the dialog's template ref; `null` while none is mounted */
  const dialogRef = computed<T | null>({
    get: () => state.value,
    set: (dialog) => {
      if (import.meta.dev && dialog && state.value && dialog !== state.value) {
        console.warn(
          `useDialog('${key}'): a second dialog is bound to this key and replaces the first; give each its own key`,
        );
      }
      state.value = dialog;
    },
  });

  const isOpen = computed(() => !!dialogRef.value?.isVisible);

  function open() {
    if (!dialogRef.value) {
      if (import.meta.dev) {
        console.warn(
          `useDialog('${key}').open(): no dialog is mounted under this key`,
        );
      }
      return;
    }
    dialogRef.value.openDialog();
  }

  /** Resolves once the dialog has closed (MobileMenu: right away). */
  async function close() {
    await dialogRef.value?.closeDialog();
  }

  return { dialogRef, open, close, isOpen };
}

/**
 * `useDialog` under a name no project uses. The auth layer calls this one: a
 * project's own `useDialog` (the Auditor's) shadows the layer's by name.
 */
export const useLayerDialog = useDialog;
