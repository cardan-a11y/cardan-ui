<script setup lang="ts">
/**
 * Asks for the password before a sensitive change (Fortify's `password.confirm`);
 * `usePasswordConfirmation()` opens it. `MfaSettings` and `MfaSetup` mount their
 * own; mount one in the layout for flows of your own.
 */

const { username = undefined } = defineProps<{
  /**
   * The signed-in user's login name, for password managers. Defaults to the
   * `email` of the authenticated user's payload.
   */
  username?: string;
}>();

const { user } = useAuth();

// `AuthUser` is each app's own payload: the layer cannot declare `email` on it
const loginName = computed(
  () => username ?? (user.value?.data as { email?: string } | undefined)?.email,
);

const {
  passwordConfirmationError,
  loadingPasswordConfirmation,
  passwordConfirmationRequest,
  registerPasswordConfirmationDialog,
  unregisterPasswordConfirmationDialog,
  confirmPassword,
  passwordConfirmationDialogClosed,
} = usePasswordConfirmation();

const formId = useId();
const password = ref('');
const showPassword = ref(false);
const dialogRef = useTemplateRef<DialogComponent>('dialog');
const passwordInputRef = useTemplateRef<InputComponent>('passwordInput');

onMounted(() => {
  if (dialogRef.value) registerPasswordConfirmationDialog(dialogRef.value);
});

onBeforeUnmount(() => {
  if (dialogRef.value) unregisterPasswordConfirmationDialog(dialogRef.value);
});

async function handleSubmit() {
  if (await confirmPassword(password.value)) password.value = '';
}

function handleClose() {
  password.value = '';
  showPassword.value = false;
  passwordConfirmationDialogClosed();
}
</script>

<template>
  <Dialog
    ref="dialog"
    :label="$t('password-confirmation.title')"
    class="password-confirmation-dialog"
    position="center"
    :click-outside="false"
    @close="handleClose"
  >
    <p>{{ $t('password-confirmation.description') }}</p>

    <!-- Keyed per request: a fresh field that the browser autofills again -->
    <Form
      :id="formId"
      :key="passwordConfirmationRequest"
      class="password-confirmation-form"
      :autofocus-fn="() => passwordInputRef?.focusElement()"
      @submit="handleSubmit"
    >
      <!-- The account a password manager matches its saved password on -->
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

      <ErrorMessage :data="passwordConfirmationError" />
    </Form>

    <hr class="password-confirmation-divider" />

    <template #buttons>
      <Button
        type="submit"
        :form="formId"
        variant="black"
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
  --dialog-max-width: 480px;

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
    margin-block-start: 1.25rem;
  }
}
</style>
