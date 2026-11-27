import { vi } from 'vitest';

/**
 * The console guard for vitest: a test fails when it wrote to `console.error`
 * or `console.warn` (Vue's warnings, the layer's own development warnings,
 * vue-i18n's), unless it named the message with `expectConsole()` or spied on
 * that method itself. test/console-setup.ts installs it around every test; a
 * project gets it with `failOnConsole: true` in `cardanVitestConfig()`.
 *
 * ```ts
 * import { expectConsole } from '#layer-test/console';
 *
 * it('warns about a value of the other mode', async () => {
 *   expectConsole('warn', /has an array as its value/);
 *   await mountSuspended(ComboBox, { props: { modelValue: [1] } });
 * });
 * ```
 */

type Kind = 'error' | 'warn';

const kinds: Kind[] = ['error', 'warn'];

type Guard = {
  originals: Record<Kind, (...args: unknown[]) => void>;
  wrappers: Record<Kind, (...args: unknown[]) => void>;
  seen: { kind: Kind; text: string }[];
  expected: { kind: Kind; pattern: RegExp; count: number }[];
};

// On globalThis: the setup file and a test file may load their own copy of
// this module
const store = globalThis as { cardanConsole?: Guard };

/** What a console call prints, as one line of text */
function textOf(args: unknown[]): string {
  return args
    .map((arg) =>
      arg instanceof Error
        ? `${arg.name}: ${arg.message}`
        : typeof arg === 'string'
          ? arg
          : (() => {
              try {
                return JSON.stringify(arg) ?? String(arg);
              } catch {
                return String(arg);
              }
            })(),
    )
    .join(' ');
}

/** Before each test: records what reaches `console.error` and `console.warn` */
export function installConsoleGuard() {
  const originals = {} as Guard['originals'];
  const wrappers = {} as Guard['wrappers'];
  const guard: Guard = { originals, wrappers, seen: [], expected: [] };

  for (const kind of kinds) {
    originals[kind] = console[kind];
    wrappers[kind] = (...args: unknown[]) => {
      const text = textOf(args);
      const expected = guard.expected.find(
        (e) => e.kind === kind && e.pattern.test(text),
      );
      if (expected) {
        expected.count++;
        return;
      }
      guard.seen.push({ kind, text });
      originals[kind](...args);
    };
    console[kind] = wrappers[kind];
  }
  store.cardanConsole = guard;
}

/**
 * After each test: puts the console back and returns what fails the test, the
 * unexpected messages and the expected ones that never came. A method the test
 * replaced with its own spy is its own business and is not checked.
 */
export function resetConsole(): string[] {
  const guard = store.cardanConsole;
  if (!guard) return [];
  store.cardanConsole = undefined;

  const problems: string[] = [];
  for (const kind of kinds) {
    const own = console[kind] !== guard.wrappers[kind];
    // The spy's original is the wrapper: restored later, it would bring it back
    const method = console[kind];
    if (vi.isMockFunction(method)) method.mockRestore();
    console[kind] = guard.originals[kind];
    if (own) continue;

    problems.push(
      ...guard.seen
        .filter((s) => s.kind === kind)
        .map((s) => `${kind}: ${s.text}`),
      ...guard.expected
        .filter((e) => e.kind === kind && e.count === 0)
        .map((e) => `expected ${kind} never came: ${e.pattern}`),
    );
  }
  return problems;
}

/**
 * The test writes this message to the console, at least once: it is not
 * printed and does not fail the test. A message that never came fails it.
 */
export function expectConsole(kind: Kind, pattern: RegExp) {
  const guard = store.cardanConsole;
  if (!guard) {
    throw new Error(
      'expectConsole() needs the console guard: list test/console-setup.ts (failOnConsole in cardanVitestConfig)',
    );
  }
  guard.expected.push({ kind, pattern, count: 0 });
}
