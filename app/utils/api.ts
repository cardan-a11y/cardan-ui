/** A JSON:API error object, as the Cardan APIs send under `/api/v1` */
type JsonApiError = {
  detail?: string;
  title?: string;
  source?: { parameter?: string; pointer?: string };
};

type ErrorBody = {
  message?: unknown;
  /** Laravel's per field, JSON:API's objects, or Statamic's plain messages */
  errors?: Record<string, string[]> | (JsonApiError | string)[];
  /** Statamic: the first message of each field */
  error?: unknown;
};

type ErrorSource = {
  response?: { _data?: unknown; headers?: Headers };
  headers?: Headers;
  _data?: unknown;
  data?: unknown;
  cause?: unknown;
};

/**
 * The error of a failed request to a Cardan API, for ErrorMessage, in
 * Laravel's shape: `{ message, errors: { field: [...] } }`. A JSON:API
 * envelope (`errors: [{ detail, source }]`) is folded into it: each `detail`
 * under its `source.parameter`. Details that name no field become the
 * message, or, next to field errors, the first entry of `errors` (the empty
 * key), so neither is lost. Statamic's failed form post (`errors: [string]`,
 * `error: { field: string }`) is folded the same way: `error` gives each
 * field its first message, and a message in `errors` that no field holds is
 * a general one.
 *
 * Takes what the fetch layer threw: an `ofetch` error (the body on
 * `response._data`), the error of `useAsyncData` or `useFetch` (the request's
 * error is its `cause`), or a response (`_data`) or body (`data`) of its own.
 *
 * `language` is the API's `Content-Language`, so the messages are announced in
 * their own language (WCAG 3.1.2), or English: the Cardan APIs write in
 * English where they negotiate no language (`APP_LOCALE=en`).
 *
 * Always returns an object, since it is only called for a failed request.
 * Without a message it is empty (an HTML error page, an empty body, a server
 * that did not answer, an error in the code itself), or `{ offline: true }`
 * when the browser was offline as the request failed: ErrorMessage then says
 * so in the page's own language. The online state is read here, as the
 * request fails, and not by the box: a box that followed `useOnline()` would
 * blame the server for an offline failure once the connection is back.
 */
export function extractApiError(error: unknown): ApiErrorData {
  let source = error as ErrorSource | null;
  const cause = source?.cause as ErrorSource | undefined;
  if (cause?.response) source = cause;

  const body = (source?.response?._data ?? source?._data ?? source?.data) as
    | ErrorBody
    | null
    | undefined;
  // Offline, the request cannot have been answered. `navigator` exists on the
  // server too, without `onLine`.
  if (!body || typeof body !== 'object') {
    const offline = globalThis.navigator?.onLine === false;
    return offline ? { offline } : {};
  }

  const message = typeof body.message === 'string' ? body.message : undefined;
  const headers = source?.response?.headers ?? source?.headers;
  const language = headers?.get?.('Content-Language') || 'en';

  if (!Array.isArray(body.errors)) {
    const errors =
      body.errors && Object.keys(body.errors).length ? body.errors : undefined;
    if (!message && !errors) return {};

    return { message, errors, language };
  }

  const general: string[] = [];
  const fields: Record<string, string[]> = {};

  if (body.error && typeof body.error === 'object') {
    for (const [field, detail] of Object.entries(body.error)) {
      if (typeof detail === 'string') fields[field] = [detail];
    }
  }
  const fieldMessages = new Set(Object.values(fields).flat());

  for (const item of body.errors) {
    if (typeof item === 'string') {
      if (!fieldMessages.has(item)) general.push(item);
      continue;
    }

    const detail = item.detail ?? item.title;
    if (!detail) continue;

    const field = item.source?.parameter;
    if (field) (fields[field] ??= []).push(detail);
    else general.push(detail);
  }

  if (!Object.keys(fields).length) {
    const joined = general.join(' ') || message;
    return joined ? { message: joined, language } : {};
  }

  const errors = general.length ? { '': general, ...fields } : fields;
  return { errors, language };
}

/**
 * The messages of an API error, as ErrorMessage shows them: every field's
 * messages, or else the message. Laravel's `message` next to `errors` only
 * sums the field messages up ("… (and 1 more error)"), so it is left out then.
 */
export function apiErrorMessages(data?: ApiErrorData | null): string[] {
  if (data?.errors) return [...new Set(Object.values(data.errors).flat())];
  return data?.message ? [data.message] : [];
}
