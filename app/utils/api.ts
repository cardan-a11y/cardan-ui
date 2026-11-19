type JsonApiError = {
  detail?: string;
  title?: string;
  source?: { parameter?: string; pointer?: string };
};

type ErrorBody = {
  message?: unknown;
  errors?: Record<string, string[]> | (JsonApiError | string)[];
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
 * Laravel's shape `{ message, errors: { field: [...] }, language }`. JSON:API
 * envelopes and Statamic's failed form post are folded into it; messages that
 * name no field become the message, or `errors['']` next to field errors.
 * `language` is the `Content-Language`, else English.
 *
 * Takes what the fetch layer threw: an `ofetch` error, the error of
 * `useAsyncData` or `useFetch`, or a response or body of its own. Without a
 * message it is empty, or `{ offline: true }` when the browser was offline as
 * the request failed.
 */
export function extractApiError(error: unknown): ApiErrorData {
  let source = error as ErrorSource | null;
  const cause = source?.cause as ErrorSource | undefined;
  if (cause?.response) source = cause;

  const body = (source?.response?._data ?? source?._data ?? source?.data) as
    ErrorBody | null | undefined;
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
 * messages once, or else the message (Laravel's next to `errors` only sums them up).
 */
export function apiErrorMessages(data?: ApiErrorData | null): string[] {
  if (data?.errors) return [...new Set(Object.values(data.errors).flat())];
  return data?.message ? [data.message] : [];
}
