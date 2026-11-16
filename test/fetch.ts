/**
 * A failed request as `$fetch` (ofetch) throws it: an error with the
 * response's status, its parsed body on `response._data` and its headers.
 * `extractApiError` reads the body and the `Content-Language` from it.
 */
export function fetchError(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return Object.assign(new Error(`[POST] "/api": ${status}`), {
    status,
    statusCode: status,
    data: body,
    response: { status, _data: body, headers: new Headers(headers) },
  });
}
