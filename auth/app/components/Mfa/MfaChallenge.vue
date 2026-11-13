<script setup lang="ts">
/**
 * Second-factor step of the sign-in flow: a six-digit code or a recovery code.
 * Shown by the layer's `/two-factor-authentication` page; an app that wants
 * its own frame overrides that page and renders this component inside it.
 */
const {
  card = true,
  headingLevel = 1,
  autofocus = true,
} = defineProps<{
  /** Wrap the form in a Card. Leave off when the page frames it already. */
  card?: boolean;
  /** Level of the heading. 2 places it below a page's own `h1`. */
  headingLevel?: 1 | 2;
  /** Focus the code input on mount. Leave off when it shares a page. */
  autofocus?: boolean;
}>();

const Card = resolveComponent('Card');

const {
  loadingSolveMfaChallenge,
  codeInputRef,
  recoveryCodeInputRef,
  mfaCredentials,
  mfaError,
  solveMfaChallenge,
  resetMfa,
} = useMfa();

// A fresh challenge on every sign-in: the code and error of one abandoned
// earlier (Back to the login page) go before the first render and on leaving
onBeforeMount(resetMfa);
onUnmounted(resetMfa);

const useRecoveryCode = ref(false);

const canSubmit = computed(
  () =>
    (useRecoveryCode.value && !!mfaCredentials.value.recovery_code?.length) ||
    (!useRecoveryCode.value && mfaCredentials.value.code?.length === 6),
);

async function toggleUseRecoveryCode() {
  useRecoveryCode.value = !useRecoveryCode.value;

  mfaCredentials.value = {
    code: '',
    recovery_code: '',
  };

  mfaError.value = null;

  // The other input only exists after the swap has rendered, so its ref is
  // still empty (or stale) until the next tick.
  await nextTick();

  if (useRecoveryCode.value) recoveryCodeInputRef.value?.focusElement();
  else codeInputRef.value?.focusElement();
}
</script>

<template>
  <div class="mfa-challenge-wrapper">
    <div class="mfa-header">
      <component :is="`h${headingLevel}`" class="mfa-heading">
        {{ $t('mfa.heading') }}
      </component>

      <p v-if="useRecoveryCode">
        {{ $t('mfa.recovery-code-instructions') }}
      </p>

      <p v-else>{{ $t('mfa.challenge-instructions') }}</p>
    </div>

    <component
      :is="card ? Card : 'div'"
      v-bind="card ? { backgroundColor: 'white' } : {}"
      class="mfa-card"
    >
      <Form
        class="mfa-form"
        :autofocus-fn="
          autofocus
            ? () =>
                useRecoveryCode
                  ? recoveryCodeInputRef?.focusElement()
                  : codeInputRef?.focusElement()
            : undefined
        "
        @submit="solveMfaChallenge"
      >
        <MfaRecoveryCode v-if="useRecoveryCode" />

        <MfaCode v-else />

        <Button
          type="submit"
          :label="$t('general.sign-in')"
          variant="black"
          size="lg"
          icon-pos="end"
          icon="material-symbols:arrow-right-alt"
          :loading="loadingSolveMfaChallenge"
          :disabled="!canSubmit"
        />

        <p v-if="useRecoveryCode" class="mfa-footer">
          <Button
            variant="link"
            :label="$t('mfa.use-code')"
            @click="toggleUseRecoveryCode"
          />
        </p>

        <p v-else class="mfa-footer">
          <span>
            {{ $t('mfa.recovery-code-cta') }}
          </span>

          <Button
            variant="link"
            :label="$t('mfa.use-recovery-code')"
            @click="toggleUseRecoveryCode"
          />
        </p>
      </Form>
    </component>
  </div>
</template>

<style>
.mfa-challenge-wrapper {
  margin-inline: auto;
  text-align: center;

  .mfa-header {
    /* Sizes come from the page around it: the app's own h1 and body text */
    .mfa-heading {
      margin-block-end: 0rem;
    }

    p {
      /* max-width: 40ch; */
      margin-inline: auto;
      margin-block-end: 2.5rem;
      color: var(--color-grey-text);
    }
  }

  .mfa-code-input,
  .mfa-recovery-code-input {
    width: 100%;
  }

  .mfa-card {
    max-width: 20rem;
    margin-inline: auto;
  }

  button[type='submit'] {
    --button-font-size: var(--font-size-md);
    margin-inline: auto;
  }

  .mfa-footer {
    font-size: var(--font-size-sm);

    > span {
      color: var(--color-grey-text);
    }
  }
}
</style>
