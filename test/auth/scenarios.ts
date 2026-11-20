import academyFortifyLogin from '../fixtures/api-errors/academy-fortify-login.json';
import type { ErrorFixture } from './fortify';

/**
 * The apps that sign in through the auth layer, as configuration for
 * `useScenario()`; update them here when an app changes its settings.
 */
export type AuthScenario = {
  name: string;
  /** The `sanctum` options of the app's nuxt.config.ts that the layer reads */
  sanctum: {
    endpoints: { user: string; login: string; logout: string };
    redirect: {
      keepRequestedRoute: boolean;
      onLogin: string | false;
      onLogout: string;
      onAuthOnly: string;
    };
  };
  /** `cardanAuth` as the app's merged app config makes it */
  cardanAuth: CardanAuthConfig;
  /** What the identity endpoint answers under `data` for this account */
  user: (fields?: Record<string, unknown>) => Record<string, unknown>;
  /** Whether the user payload carries `mfa_enabled` and the other flags */
  mfaFlags: boolean;
  /** The login refused for a wrong password */
  loginRefused: ErrorFixture;
  /** A field refused on Fortify's own routes: the two-factor routes, password confirmation */
  fortifyRouteError: (field: string, message: string) => ErrorFixture;
  /** A field refused on the password routes (forgot, reset, update) */
  passwordRouteError: (field: string, message: string) => ErrorFixture;
  /** The language its error messages are marked with */
  errorLanguage: string;
};

/** The layer's own defaults, auth/app/app.config.ts: the Academy API's */
const layerDefaults: CardanAuthConfig = {
  endpoints: {
    forgotPassword: '/api/v1/auth/forgot-password',
    resetPassword: '/api/v1/auth/reset-password',
    updatePassword: '/api/v1/profile/password',
    passwordPolicy: '/api/v1/password-policy',
    twoFactorChallenge: '/api/two-factor-challenge',
    twoFactorAuthentication: '/api/user/two-factor-authentication',
    twoFactorConfirmation: '/api/user/confirmed-two-factor-authentication',
    twoFactorQrCode: '/api/user/two-factor-qr-code',
    twoFactorRecoveryCodes: '/api/user/two-factor-recovery-codes',
    confirmPassword: '/api/user/confirm-password',
    confirmedPasswordStatus: '/api/user/confirmed-password-status',
  },
  updatePasswordMethod: 'PATCH',
  passwordPolicy: { minLength: 14, maxLength: 128, serverChecks: true },
};

/**
 * cardan-academy-nuxt: the layer's defaults, MFA flags in the payload, Laravel's
 * errors on Fortify routes and JSON:API on `/api/v1`, with `Content-Language`.
 */
export const academy: AuthScenario = {
  name: 'Academy',
  sanctum: {
    endpoints: {
      user: '/api/v1/profile',
      login: '/api/login',
      logout: '/api/logout',
    },
    redirect: {
      keepRequestedRoute: true,
      onLogin: '/dashboard',
      onLogout: '/login',
      onAuthOnly: '/login',
    },
  },
  cardanAuth: layerDefaults,
  user: (fields = {}) => ({
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    mfa_enabled: true,
    mfa_required: false,
    mfa_exempt: false,
    ...fields,
  }),
  mfaFlags: true,
  loginRefused: academyFortifyLogin,
  // The shape of academy-fortify-login.json: Laravel's, labelled in Dutch
  fortifyRouteError: (field, message) => ({
    from: 'cardan-academy-api Fortify routes, as academy-fortify-login.json',
    status: 422,
    headers: { 'Content-Type': 'application/json', 'Content-Language': 'nl' },
    body: { message, errors: { [field]: [message] } },
  }),
  // The shape of academy-checkout-validation.json
  // (ApiExceptionRenderer::fromValidation), for a field of a password route
  passwordRouteError: (field, message) => ({
    from: 'cardan-academy-api /api/v1, as academy-checkout-validation.json',
    status: 422,
    headers: {
      'Content-Type': 'application/vnd.api+json',
      'Content-Language': 'nl',
    },
    body: {
      errors: [
        {
          status: '422',
          title: 'Unprocessable Entity',
          detail: message,
          source: { parameter: field },
        },
      ],
    },
  }),
  errorLanguage: 'nl',
};

/**
 * cardan-auditor-nuxt: Fortify's own password routes (`PUT`), no policy
 * endpoint, no MFA flags; Laravel's errors in English without `Content-Language`.
 */
export const auditor: AuthScenario = {
  name: 'Auditor',
  sanctum: {
    endpoints: {
      user: '/api/user',
      login: '/api/login',
      logout: '/api/logout',
    },
    redirect: {
      keepRequestedRoute: true,
      onLogin: '/',
      onLogout: '/login',
      onAuthOnly: '/login',
    },
  },
  cardanAuth: {
    endpoints: {
      ...layerDefaults.endpoints,
      forgotPassword: '/api/forgot-password',
      resetPassword: '/api/reset-password',
      updatePassword: '/api/user/password',
      passwordPolicy: false,
    },
    updatePasswordMethod: 'PUT',
    passwordPolicy: { minLength: 8, maxLength: null, serverChecks: false },
  },
  user: (fields = {}) => ({
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    ...fields,
  }),
  mfaFlags: false,
  loginRefused: {
    from: "Fortify's POST /api/login with a wrong password: Laravel's shape and lang/en/auth.php 'failed', no Content-Language",
    status: 422,
    headers: { 'Content-Type': 'application/json' },
    body: {
      message: 'These credentials do not match our records.',
      errors: { email: ['These credentials do not match our records.'] },
    },
  },
  fortifyRouteError: (field, message) => ({
    from: "Fortify's routes: Laravel's shape, as auditor-audit-validation.json",
    status: 422,
    headers: { 'Content-Type': 'application/json' },
    body: { message, errors: { [field]: [message] } },
  }),
  passwordRouteError: (field, message) => ({
    from: "Fortify's password routes: Laravel's shape, as auditor-audit-validation.json",
    status: 422,
    headers: { 'Content-Type': 'application/json' },
    body: { message, errors: { [field]: [message] } },
  }),
  errorLanguage: 'en',
};

export const scenarios = [academy, auditor];
