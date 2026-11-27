import { expect, test as base } from '@playwright/test';
import { withConsole } from './console';
import { withOtherOrigins } from './network';

/**
 * The layer's `test`, which every spec imports: a console error, a hydration
 * warning or an uncaught error fails it (./console.ts), and so does a request
 * to another origin no test answered (./network.ts).
 */
const withConsoleGuard = withConsole(base, expect, {
  // A visitor's identity request: the mock API answers 401, as a real one
  ignore: (message) =>
    message.url.endsWith('/api/user') && /status of 401/.test(message.text),
});

export const test = withOtherOrigins(withConsoleGuard, expect);

export { expect };
