/** A failed request as `$fetch` (ofetch) throws it: status, body on `response._data`, headers. */
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
