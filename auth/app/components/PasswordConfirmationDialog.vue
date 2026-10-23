<script setup lang="ts">
/**
 * Asks the signed-in user for their password before a sensitive change, for
 * Fortify's `password.confirm`. Mount it once, high in the app (the layout);
 * `usePasswordConfirmation()` opens it and waits for the answer.
 */

const { username = undefined } = defineProps<{
  /**
   * The signed-in user's login name, for password managers. Defaults to the
   * `email` of the authenticated user's payload.
   */
  username?: string;
}>();

const { user } = useAuth();

/**
 * Read through a local type, like `useAuth().userName`: `AuthUser` is each
 * app's own payload, and the layer cannot declare `email` on it.
 */
const loginName = computed(
  () => username ?? (user.value?.data as { email?: string } | undefined)?.email,
);

const {
  passwordConfirmationDialogRef,
  passwordConfirmationError,
  loadingPasswordConfirmation,
  passwordConfirmationRequest,
  confirmPassword,
  cancelPasswordConfirmation,
} = usePasswordConfirmation();

const formId = useId();
const password = ref('');
const showPassword = ref(false);
const passwordInputRef = useTemplateRef<InputComponent>('passwordInput');

async function handleSubmit() {
  if (await confirmPassword(password.value)) password.value = '';
}

function handleClose() {
  password.value = '';
  showPassword.value = false;
  cancelPasswordConfirmation();
}
</script>

<template>
  <Dialog
    ref="passwordConfirmationDialogRef"
    :label="$t('password-confirmation.title')"
    class="password-confirmation-dialog"
    position="center"
    :click-outside="false"
    @close="handleClose"
  >
    <p>{{ $t('password-confirmation.description') }}</p>

    <!-- Keyed per request: a fresh form for every confirmation, so the browser
         autofills it again and its autofocus puts focus in the password field. -->
    <Form
      :id="formId"
      :key="passwordConfirmationRequest"
      class="password-confirmation-form"
      :autofocus-fn="() => passwordInputRef?.focusElement()"
      @submit="handleSubmit"
    >
      <!-- A password manager offers a saved password by the username it was
           saved with. A form with a password field only gives it nothing to
           match on, so name the account here, out of sight and out of the
           accessibility tree. -->
      <input
        v-if="loginName"
        type="email"
        name="username"
        autocomplete="username"
        :value="loginName"
        readonly
        hidden
      />

      <div class="password-input-wrapper">
        <Input
          ref="passwordInput"
          v-model="password"
          required
          autofocus
          :type="showPassword ? 'text' : 'password'"
          name="password"
          autocomplete="current-password"
          :label="$t('password.heading')"
        />

        <PasswordReveal v-model="showPassword" size="md" />
      </div>

      <AuthError :data="passwordConfirmationError" />
    </Form>

    <hr class="password-confirmation-divider" />

    <template #buttons>
      <Button
        type="submit"
        :form="formId"
        variant="black"
        size="lg"
        icon="material-symbols:check"
        :label="$t('general.confirm')"
        :loading="loadingPasswordConfirmation"
        :disabled="!password"
      />
    </template>
  </Dialog>
</template>

<style>
.password-confirmation-dialog {
  width: 100%;
  max-width: 490px;

  p {
    margin-block-start: 0;
  }

  .password-confirmation-form {
    display: grid;
    gap: 1rem;
  }

  .password-confirmation-divider {
    block-size: 1px;
    background-color: var(--color-grey-light);
    margin-block-start: 1.5rem;
  }

  .dialog-buttons {
    margin-block-start: 1.5rem;

    .button {
      --font-size: var(--font-size-sm);
    }
  }
}
</style>
