<script setup lang="ts">
/**
 * Email and password sign-in through nuxt-auth-sanctum, on to the challenge
 * when a second factor is due. The page around it is the login page's.
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
  /** Offer a "Remember me" checkbox, unticked: sends `remember: true` when ticked. */
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
   * a sign-in that navigates on, while the page transition plays.
   */
  loadingDelay?: number;
}>();

/** The address, bindable to share it with another form (`useLoginEmail()`). */
const email = defineModel<string>('email', { default: '' });

const { loginWithoutRedirect, refreshIdentity, loginRedirectTarget } =
  useAuth();

const password = ref('');
const showPassword = ref(false);
const rememberMe = ref(false);
const submitting = ref(false);
const shaking = ref(false);
const error = ref<ApiErrorData | null>(null);

const shakeStyle = computed(() =>
  shake && shaking.value ? 'animation: var(--animation-shake)' : undefined,
);

async function handleLogin() {
  const route = useRoute();

  shaking.value = false;
  error.value = null;
  submitting.value = true;
  let navigating = false;

  try {
    const response = await loginWithoutRedirect({
      email: email.value,
      password: password.value,
      ...(remember && rememberMe.value ? { remember: true } : {}),
    });

    if (response?.two_factor) {
      emit('twoFactor');

      navigating = true;
      return await navigateTo({
        path: twoFactorPath,
        query: { redirect: route.query.redirect },
      });
    }

    await refreshIdentity();
    emit('success');

    const target = loginRedirectTarget();

    if (target !== false) {
      navigating = true;
      return await navigateTo(target);
    }
  } catch (e) {
    error.value = extractApiError(e);
    shaking.value = true;
    emit('error', error.value);
  } finally {
    if (navigating && loadingDelay > 0) {
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
  error: [error: ApiErrorData | null];
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

    <Checkbox
      v-if="remember"
      v-model="rememberMe"
      name="remember"
      :label="$t('auth.remember-me')"
    />

    <slot name="fields" />

    <template v-if="errorPosition === 'above-submit'">
      <slot name="error" :error="error">
        <ErrorMessage :data="error" />
      </slot>
    </template>

    <hr v-if="divider" />

    <Button
      type="submit"
      icon-pos="end"
      icon="material-symbols:arrow-right-alt"
      :loading="submitting"
      variant="black"
      size="lg"
      :label="$t('general.sign-in')"
    />

    <template v-if="errorPosition === 'below-submit'">
      <slot name="error" :error="error">
        <ErrorMessage :data="error" />
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

  /* The form places its error itself, whatever an app gives the box elsewhere */
  .error-message {
    margin-block-start: 0;
    min-width: 100%;
    max-width: none;
  }

  &.show-invalid:has(:invalid) .button[type='button'] {
    align-self: center;
  }

  .button {
    &[type='submit'] {
      --button-font-size: var(--font-size-md);
      margin-block-start: 0.25rem;
      flex-basis: 100%;
    }
  }
}

:root {
  --animation-shake: cardan-auth-shake var(--duration-lg) both;
}

@keyframes cardan-auth-shake {
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
