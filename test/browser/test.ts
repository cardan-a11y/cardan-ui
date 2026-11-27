import { expect, test as base } from '@playwright/test';
import { withConsole } from './console';

/**
 * The layer's `test`, which every spec imports: a console error, a hydration
 * warning or an uncaught error fails it (./console.ts).
 */
export const test = withConsole(base, expect, {
  // A visitor's identity request: the mock API answers 401, as a real one
  ignore: (message) =>
    message.url.endsWith('/api/user') && /status of 401/.test(message.text),
});

export { expect };
