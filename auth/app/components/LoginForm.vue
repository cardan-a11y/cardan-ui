<script setup lang="ts">
/**
 * Email + password sign-in, wired to nuxt-auth-sanctum and aware of a pending
 * second factor.
 *
 * Only the form lives here: the surrounding page (heading, tabs,
 * forgot-password link) stays with the app.
 */
const {
  showPasswordToggle = true,
  divider = false,
  remember = false,
  errorPosition = 'above-submit',
  size = 'lg',
  autofocus = true,
  shake = true,
  twoFactorPath = '/two-factor-authentication',
  loadingDelay = 0,
} = defineProps<{
  /** Reveal-password button beside the password field. */
  showPasswordToggle?: boolean;
  /** Rule between the fields and the submit button. */
  divider?: boolean;
  /** Send `remember: true` with the credentials. */
  remember?: boolean;
  errorPosition?: LoginErrorPosition;
  size?: InputSize;
  autofocus?: boolean;
  /** Shake the fields when the credentials are rejected. */
  shake?: boolean;
  /** Route to send the user to when a second factor is required. */
  twoFactorPath?: string;
  /**
   * Hold the submit button in its loading state this many milliseconds after
   * the request settles — useful when a page transition follows the redirect.
   */
  loadingDelay?: number;
}>();

/**
 * Bindable so an app can share the typed address with a sibling form — the
 * Auditor login page keeps its forgot-password tab on the same state. Falls
 * back to its own local state when nothing is bound.
 */
const email = defineModel<string>('email', { default: '' });

const { loginWithoutRedirect, refreshIdentity, loginRedirectTarget } =
  useAuth();

const password = ref('');
const showPassword = ref(false);
const submitting = ref(false);
const shaking = ref(false);
const error = ref<AuthErrorData | null>(null);

const shakeStyle = computed(() =>
  shake && shaking.value ? 'animation: var(--animation-shake)' : undefined,
);

async function handleLogin() {
  const route = useRoute();

  shaking.value = false;
  error.value = null;
  submitting.value = true;

  try {
    const response = await loginWithoutRedirect({
      email: email.value,
      password: password.value,
      ...(remember ? { remember: true } : {}),
    });

    if (response?.two_factor) {
      emit('twoFactor');

      return await navigateTo({
        path: twoFactorPath,
        query: { redirect: route.query.redirect },
      });
    }

    await refreshIdentity();
    emit('success');

    const target = loginRedirectTarget();

    if (target !== false) return await navigateTo(target);
  } catch (e) {
    error.value = extractAuthError(e);
    shaking.value = true;
    emit('error', error.value);
  } finally {
    if (loadingDelay > 0) {
      // Keeps the spinner up while the redirect's page transition plays, so
      // the button does not flick back to its resting state first.
      setTimeout(() => {
        submitting.value = false;
      }, loadingDelay);
    } else {
      submitting.value = false;
    }
  }
}

const emit = defineEmits<{
  /** Credentials accepted and the identity refreshed. */
  success: [];
  /** Credentials accepted, but a second factor is required. */
  twoFactor: [];
  error: [error: AuthErrorData | null];
}>();

defineExpose({ submitting, error });
</script>

<template>
  <Form class="login-form" @submit="handleLogin()">
    <Input
      v-model="email"
      :autofocus="autofocus"
      required
      type="email"
      name="email"
      autocomplete="username"
      :size="size"
      :label="$t('general.email')"
      :style="shakeStyle"
    />

    <div class="password-input-wrapper" :style="shakeStyle">
      <Input
        v-model="password"
        required
        :type="showPassword ? 'text' : 'password'"
        :label="$t('password.heading')"
        name="password"
        autocomplete="current-password"
        :size="size"
      />

      <PasswordReveal
        v-if="showPasswordToggle"
        v-model="showPassword"
        :size="size"
      />
    </div>

    <!-- Extra fields, e.g. a remember-me checkbox. -->
    <slot name="fields" />

    <template v-if="errorPosition === 'above-submit'">
      <slot name="error" :error="error">
        <AuthError :data="error" />
      </slot>
    </template>

    <hr v-if="divider" />

    <Button
      type="submit"
      icon-pos="end"
      icon="material-symbols:arrow-right-alt"
      :loading="submitting"
      variant="black"
      :label="$t('general.sign-in')"
    />

    <template v-if="errorPosition === 'below-submit'">
      <slot name="error" :error="error">
        <AuthError :data="error" />
      </slot>
    </template>

    <slot name="footer" />
  </Form>
</template>

<style>
.login-form {
  max-width: 21rem;
  margin-inline: auto;

  > hr {
    block-size: 1px;
    background-color: var(--color-grey-light);
  }

  .auth-error {
    margin-block-start: 0rem;
    min-width: 100%;
    max-width: none;
  }

  &.show-invalid:has(:invalid) .button[type='button'] {
    align-self: center;
  }

  .button {
    &[type='submit'] {
      --font-size: var(--font-size-md);
      margin-block-start: 0.25rem;
      flex-basis: 100%;
    }
  }
}

:root {
  --animation-shake: shake var(--duration-lg) both;
}

@keyframes shake {
  0% {
    translate: -10px 0;
  }
  16% {
    translate: 9px 0;
  }
  33% {
    translate: -6px 0;
  }
  50% {
    translate: 5px 0;
  }
  66% {
    translate: -2px 0;
  }
  83% {
    translate: 1px 0;
  }
  100% {
    translate: 0px 0;
  }
}
</style>
