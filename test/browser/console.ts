import type {
  ConsoleMessage,
  Expect,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
  TestType,
  WebError,
} from '@playwright/test';

/**
 * The console guard for Playwright: a test fails when a page of its context
 * logged a console error or a hydration warning, or threw an error nothing
 * caught (`pageerror`), at any moment of the test, not only on a first load.
 * The layer's specs import `test` from ./test.ts, which has it; a project's
 * suite wraps its own `test`, under `withApi()` when it uses both:
 *
 * ```ts
 * import { expect, test as base } from '@playwright/test';
 * import { withConsole } from '../../../cardan-ui/test/browser/console';
 *
 * export const test = withConsole(base, expect, {
 *   // The identity request of a visitor: a 401, as the real API answers
 *   ignore: (message) => message.url.endsWith('/api/user'),
 * });
 *
 * test('…', async ({ page, pageErrors }) => {
 *   pageErrors.expect(/the server responded with a status of 422/);
 * });
 * ```
 */

export type PageMessage = {
  /** `error`, `warning`, or `pageerror` for an uncaught error */
  type: string;
  text: string;
  /** Where it came from: the script, or the resource that failed to load */
  url: string;
};

export interface ConsoleOptions {
  /**
   * Messages every test may have, such as a request that fails by design.
   * Keep it narrow: a test that expects one names it with `pageErrors.expect()`.
   */
  ignore?: (message: PageMessage) => boolean;
}

/** The text and where it came from, as a failure prints it and `expect()` matches it */
const lineOf = (m: PageMessage) => (m.url ? `${m.text} (${m.url})` : m.text);

export class PageErrors {
  /** Everything that counted, in order */
  readonly messages: PageMessage[] = [];
  private expected: { pattern: RegExp; count: number }[] = [];

  constructor(private options: ConsoleOptions = {}) {}

  /**
   * The test causes this message, at least once, matched against its text
   * and URL as a failure prints them (`Failed to load resource: … (url)`):
   * it does not fail the test. One that never came fails it.
   */
  expect(pattern: RegExp) {
    this.expected.push({ pattern, count: 0 });
  }

  /** @internal */
  add(message: PageMessage) {
    if (this.options.ignore?.(message)) return;
    const expected = this.expected.find((e) => e.pattern.test(lineOf(message)));
    if (expected) expected.count++;
    else this.messages.push(message);
  }

  /** @internal */
  addConsole(message: Pick<ConsoleMessage, 'type' | 'text' | 'location'>) {
    const type = message.type();
    if (
      type === 'error' ||
      (type === 'warning' && /hydrat/i.test(message.text()))
    )
      this.add({ type, text: message.text(), url: message.location().url });
  }

  /** What fails the test so far, which no longer counts: for a test that checks it itself */
  take(): string[] {
    const problems = this.problems();
    this.messages.splice(0);
    this.expected = [];
    return problems;
  }

  /** What fails the test */
  problems(): string[] {
    return [
      ...this.messages.map((m) => `${m.type}: ${lineOf(m)}`),
      ...this.expected
        .filter((e) => e.count === 0)
        .map((e) => `expected message never came: ${e.pattern}`),
    ];
  }
}

/**
 * The project's `test` with a `pageErrors` fixture that every test gets
 * without asking: it listens to the context from its start, so pages a test
 * opens itself count too, and fails the test at its end.
 */
export function withConsole<
  T extends PlaywrightTestArgs & PlaywrightTestOptions,
  W extends PlaywrightWorkerArgs & PlaywrightWorkerOptions,
>(base: TestType<T, W>, expect: Expect, options: ConsoleOptions = {}) {
  // As in withApi(): extend the base as Playwright's own, give back the caller's
  const plain = base as unknown as TestType<
    PlaywrightTestArgs & PlaywrightTestOptions,
    PlaywrightWorkerArgs & PlaywrightWorkerOptions
  >;
  return plain.extend<{ pageErrors: PageErrors }>({
    pageErrors: [
      async ({ context }, use) => {
        const errors = new PageErrors(options);
        const onConsole = (message: ConsoleMessage) =>
          errors.addConsole(message);
        const onError = (error: WebError) => {
          const thrown = error.error();
          errors.add({
            type: 'pageerror',
            text: thrown.message,
            url: thrown.stack?.match(/https?:\/\/\S+?(?=:\d+:\d+)/)?.[0] ?? '',
          });
        };
        context.on('console', onConsole);
        context.on('weberror', onError);
        await use(errors);
        context.off('console', onConsole);
        context.off('weberror', onError);
        expect(
          errors.problems(),
          'console errors, hydration warnings and uncaught errors',
        ).toEqual([]);
      },
      { auto: true },
    ],
  }) as unknown as TestType<T & { pageErrors: PageErrors }, W>;
}
