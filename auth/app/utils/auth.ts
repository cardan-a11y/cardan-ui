/**
 * The HTTP status a failed request was answered with: on `response` for an
 * `ofetch` error, or on the error itself once unwrapped.
 */
export function responseStatus(error: unknown): number | undefined {
  const candidate = error as {
    status?: number;
    statusCode?: number;
    response?: { status?: number };
  } | null;

  return (
    candidate?.response?.status ?? candidate?.statusCode ?? candidate?.status
  );
}

/**
 * Whether a request was refused for want of a fresh password confirmation:
 * Laravel's `password.confirm` middleware answers 423 to a JSON request.
 */
export function isPasswordConfirmationRequired(error: unknown): boolean {
  return responseStatus(error) === 423;
}

/** Whether the session a request relied on is gone: Laravel answers 401. */
export function isUnauthenticated(error: unknown): boolean {
  return responseStatus(error) === 401;
}
