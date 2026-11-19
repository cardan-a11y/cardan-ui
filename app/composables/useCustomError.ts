/**
 * The `custom-error` of a field component (FormField): an error the browser
 * cannot find, such as one from the server. It shows like the field's own
 * error, and describes the field, but does not keep the form from submitting
 * again: the server judges the next attempt, and the parent moves focus to
 * the field. A new value clears it (`clearCustomError()`), until the parent
 * sets one again.
 *
 * `invalid` says whether the field's own error applies, which shows after a
 * failed submit of its Form or with `showInvalid`; `errorShown` is true while
 * either error shows, when the error text describes the field.
 */
export function useCustomError(
  customError: () => string | undefined,
  {
    invalid,
    showInvalid = () => false,
  }: {
    invalid: () => boolean | undefined;
    showInvalid?: () => boolean | undefined;
  },
) {
  const formShowInvalid = inject(formShowInvalidKey, ref(false));
  const customErrorActive = ref(false);

  function applyCustomError() {
    customErrorActive.value = !!customError();
  }

  function clearCustomError() {
    customErrorActive.value = false;
  }

  onMounted(applyCustomError);
  watch(customError, applyCustomError, { flush: 'post' });

  const errorShown = computed(
    () =>
      customErrorActive.value ||
      ((showInvalid() || formShowInvalid.value) && invalid()),
  );

  return { customErrorActive, clearCustomError, errorShown };
}
