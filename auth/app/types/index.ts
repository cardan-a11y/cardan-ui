declare global {
  /**
   * The identity endpoint's `data`. Empty: each app augments it with its own
   * payload, which types `useAuth().user`:
   *
   * ```ts
   * declare global {
   *   interface AuthUser extends User {}
   * }
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AuthUser {}

  type LoginCredentials = {
    email: string;
    password: string;
    remember?: boolean;
  };

  /** Fortify answers `two_factor: true` when a second factor is still needed. */
  type LoginResponse = {
    two_factor?: boolean;
  };

  /** The password length bounds an API enforces, see `usePasswordPolicy()`. */
  type PasswordPolicyData = {
    min_length: number;
    max_length: number;
  };

  type UpdatePasswordMethod = 'PATCH' | 'PUT' | 'POST';

  /**
   * The settings of Cardan Auth UI, under `cardanAuth` in the app config. The
   * defaults in the layer's `app/app.config.ts` are the Cardan Academy API's;
   * an app overrides single keys in its own `app.config.ts`.
   */
  type CardanAuthConfig = {
    /**
     * Paths relative to the Sanctum base URL. Sign-in, sign-out, the identity
     * and the CSRF cookie come from the `sanctum` config instead.
     */
    endpoints: {
      forgotPassword: string;
      resetPassword: string;
      updatePassword: string;
      /** `false` for an API without one: the forms then show `passwordPolicy` as is. */
      passwordPolicy: string | false;
      twoFactorChallenge: string;
      twoFactorAuthentication: string;
      twoFactorConfirmation: string;
      twoFactorQrCode: string;
      twoFactorRecoveryCodes: string;
      confirmPassword: string;
      confirmedPasswordStatus: string;
    };
    /** `PATCH` on the Cardan APIs, `PUT` on Fortify's own route. */
    updatePasswordMethod: UpdatePasswordMethod;
    passwordPolicy: {
      /** Shown until the policy endpoint answers, or as the policy without one. */
      minLength: number;
      /** `null` for no maximum. */
      maxLength: number | null;
      /** Whether the API also refuses breached, common and personal passwords; the forms list it. */
      serverChecks: boolean;
    };
    /**
     * The fields of the user payload with the account's language, in order:
     * the first that holds a language the app offers is the profile's. A dotted
     * path reaches into an object (`team.language`). Empty: the profile sets no
     * language.
     */
    localeFields: string[];
    /**
     * The field of the user payload with the account's color mode, as a dotted
     * path (`settings.theme`); `false` leaves the color mode to the browser.
     */
    themeField: string | false;
    /**
     * The app's own sign-in paths, for `isAuthPage()` next to the layer's: an
     * exact path, or a prefix that ends in `/` (`/invitations/`).
     */
    authPages: string[];
  };

  /** Where `LoginForm` renders its error relative to the submit button. */
  type LoginErrorPosition = 'above-submit' | 'below-submit';

  type MfaCredentials = {
    code: string;
    recovery_code: string;
  };

  /**
   * The MFA flow's step; open a flow with `useMfaDialog()` or `MfaSetup`
   * rather than setting it.
   *
   * 1 enable intro          4 enabled + recovery codes
   * 2 scan QR code          5 disable confirmation
   * 3 confirm with code     6 disabled
   */
  type MfaStep = 1 | 2 | 3 | 4 | 5 | 6;

  /** The auth layer's `useDialog()` keys, behind its own composables. */
  interface LayerDialogKeys {
    'auth:logout': true;
    'auth:mfa': true;
    'auth:mfa-recovery-codes': true;
    'auth:password-confirmation': true;
  }
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends unknown[]
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

declare module 'nuxt/schema' {
  interface AppConfigInput {
    /** Cardan Auth UI's settings, see `CardanAuthConfig`. */
    cardanAuth?: DeepPartial<CardanAuthConfig>;
  }
}

declare module '#app' {
  interface NuxtApp {
    /**
     * Resolves once the identity request has answered, failed or timed out;
     * never rejects. In the browser only.
     */
    $identityReady: Promise<void>;
  }

  interface PageMeta {
    /**
     * The language in the route's address: the interface follows it, for a
     * visitor and a signed-in user. Set it on every such route, the default
     * language's included.
     */
    locale?: string;
    /** `false`: a navigation here does not wait for the identity request. */
    waitForIdentity?: boolean;
  }
}

export {};
