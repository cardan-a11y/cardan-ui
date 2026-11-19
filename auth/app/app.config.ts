/**
 * Cardan Auth UI's settings, the Cardan Academy API's by default. An app
 * overrides single keys in its own `app.config.ts`, as one with Fortify's own
 * password routes and no policy endpoint does:
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
