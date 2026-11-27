import { afterEach, beforeEach } from 'vitest';
import { installConsoleGuard, resetConsole } from './console';

/**
 * Setup file: a test that writes to `console.error` or `console.warn` fails,
 * unless it named the message with `expectConsole()` (test/console.ts).
 * Listed first, so its afterEach runs last (vitest runs after-hooks in
 * reverse) and sees what an unmount or another setup file's afterEach wrote.
 */

beforeEach(() => {
  installConsoleGuard();
});

afterEach(() => {
  // Every message in full: expect's diff cuts an array of long strings short
  const problems = resetConsole();
  if (problems.length) {
    throw new Error(
      `The test wrote to the console; fix the cause, or name the message with expectConsole():\n${problems.join('\n')}`,
    );
  }
});
