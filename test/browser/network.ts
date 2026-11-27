import type {
  Expect,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
  Request,
  TestType,
} from '@playwright/test';

/**
 * The third-party guard for Playwright: a request from the browser to another
 * origin is aborted and fails the test, unless the test answers it with
 * `otherOrigins.answer()`. Nothing leaves the page for a third party in a
 * test; the server's own requests (Nitro) are not seen here. The layer's specs
 * get it from ./test.ts; a project wraps its own `test`:
 *
 * ```ts
 * export const test = withOtherOrigins(withConsole(base, expect), expect);
 *
 * test('…', async ({ page, otherOrigins }) => {
 *   otherOrigins.answer((url) => url.host === 'pay.example.com', { body: 'Paid' });
 * });
 * ```
 *
 * A route of the page (`page.route()`, as withApi() installs) runs before
 * this one, so its own answers win. A project's own backend on another
 * origin, such as a stand-in the suite starts, goes through with `allow`:
 *
 * ```ts
 * withOtherOrigins(base, expect, {
 *   allow: (url) => url.origin === 'http://localhost:8001',
 * });
 * ```
 */

export interface OtherOriginsOptions {
  /** Whether a request's URL is the project's own: it goes through, unrecorded */
  allow?: (url: URL) => boolean;
}

export type OriginAnswer = {
  status?: number;
  body?: string | Buffer;
  contentType?: string;
};

export class OtherOrigins {
  /** What was aborted, as `GET https://…`; fails the test */
  readonly unanswered: string[] = [];
  private answers: {
    match: (url: URL) => boolean;
    answer: OriginAnswer;
    label: string;
    count: number;
  }[] = [];

  /**
   * Answers the requests that match, at least one of which must come: one
   * that never came fails the test, so a request that is gone leaves the test
   */
  answer(
    match: (url: URL) => boolean,
    answer: OriginAnswer = {},
    label = String(match),
  ) {
    this.answers.push({ match, answer, label, count: 0 });
  }

  /** @internal The answer for a request, or undefined after recording it */
  answerFor(request: Request): OriginAnswer | undefined {
    const url = new URL(request.url());
    const found = this.answers.find((a) => a.match(url));
    if (found) {
      found.count++;
      return found.answer;
    }
    this.unanswered.push(`${request.method()} ${request.url()}`);
    return undefined;
  }

  /** What fails the test so far, which no longer counts: for a test that checks it itself */
  take(): string[] {
    const problems = this.problems();
    this.unanswered.splice(0);
    this.answers = [];
    return problems;
  }

  /** What fails the test */
  problems(): string[] {
    return [
      ...this.unanswered,
      ...this.answers
        .filter((a) => a.count === 0)
        .map((a) => `an answered origin was never asked: ${a.label}`),
    ];
  }
}

/** The project's `test` with an `otherOrigins` fixture that every test gets */
export function withOtherOrigins<
  T extends PlaywrightTestArgs & PlaywrightTestOptions,
  W extends PlaywrightWorkerArgs & PlaywrightWorkerOptions,
>(base: TestType<T, W>, expect: Expect, options: OtherOriginsOptions = {}) {
  // As in withApi(): extend the base as Playwright's own, give back the caller's
  const plain = base as unknown as TestType<
    PlaywrightTestArgs & PlaywrightTestOptions,
    PlaywrightWorkerArgs & PlaywrightWorkerOptions
  >;
  return plain.extend<{ otherOrigins: OtherOrigins }>({
    otherOrigins: [
      async ({ context, baseURL }, use) => {
        const origin = new URL(baseURL!).origin;
        const guard = new OtherOrigins();
        await context.route(
          (url) =>
            url.origin !== origin &&
            /^https?:$/.test(url.protocol) &&
            !options.allow?.(url),
          (route) => {
            const answer = guard.answerFor(route.request());
            if (!answer) return route.abort('blockedbyclient');
            return route.fulfill({
              status: answer.status ?? 200,
              contentType: answer.contentType,
              // A fetch from the page may read it
              headers: { 'Access-Control-Allow-Origin': '*' },
              body: answer.body ?? '',
            });
          },
        );
        await use(guard);
        expect(
          guard.problems(),
          'requests to other origins no test answered',
        ).toEqual([]);
      },
      { auto: true },
    ],
  }) as unknown as TestType<T & { otherOrigins: OtherOrigins }, W>;
}
