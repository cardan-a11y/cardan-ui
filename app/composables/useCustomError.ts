/**
 * The `custom-error` of a field component: an error the browser cannot find,
 * such as one from the server. It shows and describes the field like its own
 * error, without holding the form back, until `clearCustomError()` on a new
 * value. `invalid`: whether the field's own error applies; `errorShown`: while
 * either error shows.
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
