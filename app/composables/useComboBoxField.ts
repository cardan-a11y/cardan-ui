import type { Ref } from 'vue';

/**
 * What ComboBox's field does in both modes: open and close, select on focus,
 * settle when focus leaves or a press lands outside, the Form's sync and the
 * validity with its error. The mode (`useComboBoxSingle()` or
 * `useComboBoxMultiple()`) supplies `settle` and whether there is a value.
 */
export function useComboBoxField(field: {
  root: Readonly<Ref<HTMLElement | null>>;
  input: Readonly<Ref<HTMLInputElement | null>>;
  popup: Readonly<Ref<HTMLElement | null>>;
  isOpen: Ref<boolean>;
  isEdited: Readonly<Ref<boolean>>;
  id: string;
  disabled: () => boolean | undefined;
  required: () => boolean | undefined;
  instruction: () => string | undefined;
  customError: () => string | undefined;
  showInvalid: () => boolean | undefined;
  /** The control's own `aria-describedby`, from its attributes */
  describedby: () => unknown;
  /** The text of the error for a missing value */
  errorText: () => string;
  /** A value is there, for `required` */
  isFilled: () => boolean;
  touch: () => void;
  /** Puts the value back in the field and closes the popup; true when it was open or edited */
  settle: () => boolean;
  /** Called on every close */
  onClose?: () => void;
  /** False while focus comes back to the field without the user, which keeps the text as it is */
  selectsOnFocus?: () => boolean;
}) {
  const { input } = field;

  function open() {
    if (field.disabled() || field.isOpen.value) return;

    field.isOpen.value = true;
    field.touch();
  }

  function close() {
    field.isOpen.value = false;
    field.onClose?.();
  }

  function applyValidity(isFilled = field.isFilled()) {
    input.value?.setCustomValidity(
      field.required() && !isFilled ? field.errorText() : '',
    );
  }

  watchPostEffect(() => applyValidity());

  const { customErrorActive, clearCustomError, errorShown } = useCustomError(
    field.customError,
    {
      invalid: () => !!field.required() && !field.isFilled(),
      showInvalid: field.showInvalid,
      exempt: field.disabled,
    },
  );

  const ariaDescribedby = computed(
    () =>
      [
        field.describedby(),
        field.instruction() && `instruction-${field.id}`,
        errorShown.value && `error-${field.id}`,
      ]
        .filter(Boolean)
        .join(' ') || undefined,
  );

  const registerSync = inject(formSyncKey, null);
  let unregisterSync: (() => void) | undefined;

  onMounted(() => {
    unregisterSync = registerSync?.(field.settle);
  });
  onBeforeUnmount(() => unregisterSync?.());

  let isFocusingByPress = false;
  let keepSelection = false;

  function onFocus() {
    field.touch();
    if (field.selectsOnFocus?.() ?? true) input.value?.select();
    keepSelection = isFocusingByPress;
  }

  function onMouseDown() {
    isFocusingByPress = document.activeElement !== input.value;
  }

  /** The mouseup of the press that gave focus would undo the selection */
  function onMouseUp(event: MouseEvent) {
    if (keepSelection) event.preventDefault();

    keepSelection = false;
    isFocusingByPress = false;
  }

  function onClick() {
    if (field.isOpen.value) close();
    else open();
  }

  function onOpenButton() {
    input.value?.focus();

    if (field.isOpen.value) close();
    else open();
  }

  let isPressInPopup = false;

  function onFocusOut(event: FocusEvent) {
    const next = event.relatedTarget as Node | null;

    if (next && field.root.value?.contains(next)) return;
    // Another window took focus: nothing closes, and the pointerup of a press
    // that was held may never arrive
    if (!next && !document.hasFocus()) {
      isPressInPopup = false;
      return;
    }

    // Until a press on the list's scrollbar no longer takes focus in Firefox
    // (148): a press in the popup that takes focus gives it back, in every
    // browser, once per press
    if (isPressInPopup) {
      isPressInPopup = false;
      (event.target as HTMLElement).focus();
      return;
    }

    field.settle();
  }

  function onDocumentPress(event: PointerEvent) {
    const target = event.target as Node;

    isPressInPopup = !!field.popup.value?.contains(target);

    const wrapper =
      field.root.value?.closest('.form-field-wrapper') ?? field.root.value;

    if (
      !wrapper?.contains(target) &&
      (field.isOpen.value || field.isEdited.value)
    ) {
      field.settle();
    }
  }

  function onDocumentPressEnd() {
    isPressInPopup = false;
  }

  onMounted(() => {
    document.addEventListener('pointerdown', onDocumentPress, true);
    document.addEventListener('pointerup', onDocumentPressEnd, true);
    document.addEventListener('pointercancel', onDocumentPressEnd, true);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', onDocumentPress, true);
    document.removeEventListener('pointerup', onDocumentPressEnd, true);
    document.removeEventListener('pointercancel', onDocumentPressEnd, true);
  });

  function focusElement() {
    input.value?.focus();
  }

  return {
    open,
    close,
    applyValidity,
    customErrorActive,
    clearCustomError,
    errorShown,
    ariaDescribedby,
    onFocus,
    onMouseDown,
    onMouseUp,
    onClick,
    onOpenButton,
    onFocusOut,
    focusElement,
  };
}
