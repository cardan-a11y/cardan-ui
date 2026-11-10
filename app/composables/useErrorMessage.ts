/**
 * The error of a form or a page, for its ErrorMessage: `handleError()` in the
 * `catch` of a request, `errorData` to its `data`. Set `errorData` to
 * `undefined` before the next attempt, or when the dialog it is in closes.
 */
export function useErrorMessage() {
  const errorData = ref<ApiErrorData>();

  function handleError(error: unknown) {
    // The original error, for whoever looks into it in the console
    console.info(error);

    errorData.value = extractApiError(error);
  }

  return { errorData, handleError };
}
