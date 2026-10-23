/**
 * The settings of Cardan Auth UI: the endpoints it calls and the password
 * policy it shows, with the Cardan Academy API as the default. Sign-in,
 * sign-out, the identity and the CSRF cookie come from the `sanctum` config.
 *
 * Nuxt merges the app config of every layer, so an app overrides single keys
 * in its own `app.config.ts`. An API that still serves Fortify's own password
 * routes, and has no policy endpoint, sets for example:
 *
 * ```ts
 * export default defineAppConfig({
 *   cardanAuth: {
 *     endpoints: {
 *       forgotPassword: '/api/forgot-password',
 *       resetPassword: '/api/reset-password',
 *       updatePassword: '/api/user/password',
 *       passwordPolicy: false,
 *     },
 *     updatePasswordMethod: 'PUT',
 *     passwordPolicy: { minLength: 8, maxLength: null, serverChecks: false },
 *   },
 * });
 * ```
 */
const cardanAuth: CardanAuthConfig = {
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
  passwordPolicy: {
    minLength: 14,
    maxLength: 128,
    serverChecks: true,
  },
};

export default defineAppConfig({ cardanAuth });
