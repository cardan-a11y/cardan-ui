import { afterEach, beforeEach, expect, vi } from 'vitest';
import {
  clearNuxtState,
  useAppConfig,
  useNuxtApp,
  useRouter,
  useRuntimeConfig,
  useSanctumAuth,
} from '#imports';
import type { DOMWrapper } from '@vue/test-utils';
import { accessibleName } from '../a11y';
import { fetchError } from '../fetch';
import type { AuthScenario } from './scenarios';

/**
 * The fake API behind the auth layer: nuxt-auth-sanctum's client. Importing it
 * resets the layer's state before each test. `mockNuxtImport` only works in the
 * test file itself, so every suite adds:
 *
 * ```ts
 * mockNuxtImport('useSanctumClient', () => () => client);
 * mockNuxtImport('navigateTo', () => (...args: unknown[]) => navigate(...args));
 * ```
 */

/** The Sanctum client: answers with the routes of the last `fortify()` */
export const client = vi.fn();

/** Every navigation; resolves at once, the router stays where it is */
export const navigate = vi.fn();

/** Answers a request: the value is the response, a throw its failure */
export type Handler = (body: unknown) => unknown;

/**
 * Handlers by `'METHOD /path'` (`'GET /api/user'`), the path as the layer
 * passes it to the client
 */
export type Routes = Record<string, Handler>;

let unmatched: string[] = [];

/**
 * The API answers these routes, and only these: a request to any other is
 * refused and fails the test afterwards, so a flow cannot pass on a request
 * nobody modelled.
 */
export function fortify(routes: Routes) {
  client.mockImplementation(
    async (url: string, options: { method?: string; body?: unknown } = {}) => {
      const route = `${(options.method ?? 'GET').toUpperCase()} ${url}`;
      const handler = routes[route];

      if (!handler) {
        unmatched.push(route);
        throw new Error(`No route for ${route}`);
      }

      return await handler(options.body);
    },
  );
}

/** The bodies of the requests sent to a route, in order */
export function requests(route: string): unknown[] {
  return client.mock.calls
    .filter(
      ([url, options]) =>
        `${(options?.method ?? 'GET').toUpperCase()} ${url}` === route,
    )
    .map(([, options]) => options?.body);
}

/** A handler that fails as ofetch throws a refused request */
export function refuse(
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {},
): Handler {
  return () => {
    throw fetchError(status, body, headers);
  };
}

/** A recorded failed request, from test/fixtures/api-errors */
export type ErrorFixture = {
  from: string;
  status: number;
  headers: Record<string, string>;
  body: unknown;
};

/** A handler that fails with a recorded answer of a real API */
export function refuseWith(fixture: ErrorFixture): Handler {
  return refuse(fixture.status, fixture.body, fixture.headers);
}

/**
 * A handler whose answer waits for the test: to look at a form while its
 * request runs, or to click twice before it settles.
 */
export function pending(value: unknown = {}) {
  let answer!: () => void;
  let fail!: (error: unknown) => void;
  const settled = new Promise<unknown>((resolve, reject) => {
    answer = () => resolve(value);
    fail = reject;
  });

  return {
    handler: (() => settled) as Handler,
    answer,
    fail,
  };
}

/** Signs a user in as the API's identity endpoint would describe them */
export function signIn(data: Record<string, unknown>) {
  const { user } = useSanctumAuth<{ data: Record<string, unknown> }>();
  user.value = { data };
}

/** The state the layer shares through `useState`, see auth/app/composables */
const AUTH_STATE = [
  'mfaStep',
  'qrCode',
  'qrCodeUrl',
  'recoveryCodes',
  'mfaError',
  'mfaCredentials',
  'loadingGenerateRecoveryCodes',
  'loadingConfirmationCode',
  'loadingSolveMfaChallenge',
  'loadingDisableMfa',
  'codeInputRef',
  'recoveryCodeInputRef',
  'loadingMfaRecoveryCodesDialog',
  'loadingMfaDisableDialog',
  'cardan-ui:dialog:auth:mfa',
  'cardan-ui:dialog:auth:mfa-recovery-codes',
  'cardan-ui:dialog:auth:logout',
  'cardan-ui:dialog:auth:password-confirmation',
  'passwordConfirmationError',
  'loadingPasswordConfirmation',
  'passwordConfirmationRequest',
  'loginEmail',
  'mfaSetupReminder',
  'passwordPolicy',
  'passwordPolicyRequested',
  'cardan-ui:toasts',
  'cardan-auth:profile-locale',
];

// happy-dom lacks the browser's rule for `hidden`: axe would see hidden fields
const hiddenRule = document.createElement('style');
hiddenRule.textContent =
  '[hidden]:not([hidden="until-found"]) { display: none; }';
document.head.append(hiddenRule);

// Before each test: test/setup.ts unmounts after the suite's hooks, and an
// unmounting component still writes to this state
beforeEach(async () => {
  // The identity plugin's own request at start-up must not answer mid-test
  await useNuxtApp().$identityReady;

  client.mockReset();
  navigate.mockReset();
  navigate.mockResolvedValue(undefined);
  unmatched = [];
  fortify({});

  // Removed, not reset: a default can depend on the next test's scenario
  clearNuxtState(
    [...AUTH_STATE, useRuntimeConfig().public.sanctum.userStateKey as string],
    { reset: false },
  );
  sessionStorage.clear();

  await useRouter().push('/');
});

afterEach(() => {
  expect(unmatched, 'requests to routes the test did not answer').toEqual([]);
});

/**
 * Runs the tests of a suite under an app's configuration: its Sanctum
 * endpoints and redirects, and its `cardanAuth` app config, restored after
 * each test.
 */
export function useScenario(scenario: AuthScenario) {
  let restore: (() => void) | undefined;

  beforeEach(() => {
    const sanctum = useRuntimeConfig().public.sanctum as {
      endpoints: Record<string, unknown>;
      redirect: Record<string, unknown>;
    };
    const cardanAuth = useAppConfig().cardanAuth as CardanAuthConfig;

    const saved = structuredClone({
      endpoints: { ...sanctum.endpoints },
      redirect: { ...sanctum.redirect },
      cardanAuth: {
        endpoints: { ...cardanAuth.endpoints },
        updatePasswordMethod: cardanAuth.updatePasswordMethod,
        passwordPolicy: { ...cardanAuth.passwordPolicy },
        localeFields: [...cardanAuth.localeFields],
        themeField: cardanAuth.themeField,
        authPages: [...cardanAuth.authPages],
      },
    });

    Object.assign(sanctum.endpoints, scenario.sanctum.endpoints);
    Object.assign(sanctum.redirect, scenario.sanctum.redirect);
    Object.assign(cardanAuth.endpoints, scenario.cardanAuth.endpoints);
    Object.assign(
      cardanAuth.passwordPolicy,
      scenario.cardanAuth.passwordPolicy,
    );
    cardanAuth.updatePasswordMethod = scenario.cardanAuth.updatePasswordMethod;
    cardanAuth.localeFields = [...scenario.cardanAuth.localeFields];
    cardanAuth.themeField = scenario.cardanAuth.themeField;
    cardanAuth.authPages = [...scenario.cardanAuth.authPages];

    restore = () => {
      Object.assign(sanctum.endpoints, saved.endpoints);
      Object.assign(sanctum.redirect, saved.redirect);
      Object.assign(cardanAuth.endpoints, saved.cardanAuth.endpoints);
      Object.assign(cardanAuth.passwordPolicy, saved.cardanAuth.passwordPolicy);
      cardanAuth.updatePasswordMethod = saved.cardanAuth.updatePasswordMethod;
      cardanAuth.localeFields = saved.cardanAuth.localeFields;
      cardanAuth.themeField = saved.cardanAuth.themeField;
      cardanAuth.authPages = saved.cardanAuth.authPages;
    };
  });

  afterEach(() => restore?.());
}

/** The secret in the setup QR code: its setup key */
export const SETUP_KEY = 'JBSWY3DPEHPK3PXP';

/**
 * What Fortify's QR code endpoint answers: an SVG (here with a script in it,
 * which the layer must drop before it inlines it) and the `otpauth://` link
 */
export const QR_CODE = {
  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21"><rect width="21" height="21" fill="#ffffff"/><path d="M0 0h7v7H0z" fill="#000000"/><script>alert(1)</script></svg>',
  url: `otpauth://totp/Cardan:ada%40example.com?secret=${SETUP_KEY}&issuer=Cardan`,
};

export const RECOVERY_CODES = [
  'Xq3kP9wLmZ-a8Rt2vNcYs',
  'B7nWq2LpXe-K4mZt9RsVa',
];

/**
 * Fortify's two-factor routes, all answering as for a user whose password
 * was confirmed a moment ago; a test overrides the ones it is about. The
 * identity endpoint answers with `user`.
 */
export function twoFactorApi(
  scenario: AuthScenario,
  user: Record<string, unknown>,
  overrides: Routes = {},
): Routes {
  return {
    'GET /api/user/confirmed-password-status': () => ({ confirmed: true }),
    'POST /api/user/confirm-password': () => ({}),
    'POST /api/user/two-factor-authentication': () => ({}),
    'DELETE /api/user/two-factor-authentication': () => ({}),
    'GET /api/user/two-factor-qr-code': () => QR_CODE,
    'GET /api/user/two-factor-recovery-codes': () => RECOVERY_CODES,
    'POST /api/user/two-factor-recovery-codes': () => ({}),
    'POST /api/user/confirmed-two-factor-authentication': () => ({}),
    [`GET ${scenario.sanctum.endpoints.user}`]: () => ({ data: user }),
    ...overrides,
  };
}

/** The button with this accessible name, among the buttons in `root` */
export function buttonNamed(
  root: { findAll: (selector: string) => DOMWrapper<Element>[] },
  name: string,
): DOMWrapper<HTMLButtonElement> {
  const found = root
    .findAll('button')
    .find((button) => accessibleName(button) === name);
  if (!found) throw new Error(`No button named "${name}"`);
  return found as DOMWrapper<HTMLButtonElement>;
}
