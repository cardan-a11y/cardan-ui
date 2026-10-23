<script setup lang="ts">
/**
 * Asks for a reset link (`endpoints.forgotPassword`). The Cardan APIs answer
 * the same whether or not the address has an account, so this form does too.
 */
const { client } = useAuth();
const { endpoints } = useCardanAuthConfig();

const email = useLoginEmail();

const loading = ref(false);
const sent = ref(false);
const error = ref<AuthErrorData | null>(null);

async function requestResetLink() {
  sent.value = false;
  error.value = null;
  loading.value = true;

  try {
    await client(endpoints.forgotPassword, {
      method: 'POST',
      body: { email: email.value },
    });
    sent.value = true;
  } catch (e) {
    error.value = extractAuthError(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Form class="password-forgot-form" @submit="requestResetLink">
    <Input
      v-model="email"
      :label="$t('general.email')"
      name="email"
      type="email"
      autocomplete="username"
      size="lg"
      required
    />

    <Button
      variant="black"
      type="submit"
      :label="$t('password.request-reset')"
      icon="material-symbols:arrow-right-alt"
      icon-pos="end"
      :loading="loading"
      :disabled="sent"
    />

    <AuthError :data="error" />

    <div aria-live="polite" class="message-wrapper">
      <Callout v-if="sent" color="blue" class="password-forgot-sent">
        {{ $t('password.email-sent') }}
      </Callout>
    </div>
  </Form>
</template>

<style>
.password-forgot-form {
  max-width: 21rem;
  margin-inline: auto;

  .password-forgot-sent {
    margin-block: 0;
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-sm);
    color: var(--color-grey-text);
  }

  .message-wrapper {
    display: grid;
  }
}
</style>
