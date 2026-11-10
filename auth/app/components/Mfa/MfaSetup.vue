<script setup lang="ts">
/**
 * The enable flow — intro → QR code → confirm code → recovery codes — inline,
 * for a page rather than a dialog: a setup prompt after sign-in, an onboarding
 * step. `MfaDialog` keeps covering the same flow for account settings.
 *
 * Step headings are `h2` by default, so render it below the page's own `h1`,
 * or make them the page's `h1` with `headingLevel`.
 */
const {
  skippable = true,
  autofocus = false,
  headingLevel = 2,
  showIntro = true,
} = defineProps<{
  /** Offer a way out of the flow before MFA is on. */
  skippable?: boolean;
  /** Focus the intro heading on mount. Leave off when the page moves focus itself. */
  autofocus?: boolean;
  /**
   * Level of the step heading. 1 makes it the page's title, for a page that
   * drops its own once the flow is underway; the headings inside follow.
   */
  headingLevel?: 1 | 2;
  /**
   * Show the intro step's heading and description. Leave off when the page
   * already introduces MFA in its own words, so it is not said twice.
   */
  showIntro?: boolean;
}>();

const emit = defineEmits<{
  /** The user chose to set up MFA later. */
  skip: [];
  /** MFA is on and the user has seen the recovery codes. */
  done: [];
  /**
   * MFA has actually been turned on. The layer refreshes the Sanctum identity
   * itself; handle this to re-sync any copy of the user your app keeps.
   */
  refresh: [];
}>();

const {
  mfaStep,
  mfaCredentials,
  mfaError,
  codeInputRef,
  loadingConfirmationCode,
  enableMfa,
  enterCode,
  resetMfa,
} = useMfa();

const formId = useId();
const headingRef = useTemplateRef<HTMLHeadingElement>('heading');

/** Headings inside a step sit one level below the step heading. */
const subheadingLevel = computed(() => (headingLevel + 1) as 2 | 3);
const loadingEnable = ref(false);

const heading = computed(() => {
  if (mfaStep.value === 4) return $t('mfa.done');
  if (mfaStep.value === 2 || mfaStep.value === 3) return $t('mfa.app-config');
  return $t('mfa.heading');
});

const canConfirm = computed(() => mfaCredentials.value.code.length === 6);

async function enable() {
  loadingEnable.value = true;
  await enableMfa();
  loadingEnable.value = false;
}

async function confirm() {
  if (await enterCode()) emit('refresh');
}

function next() {
  mfaStep.value = 3;
}

function back() {
  mfaStep.value = 2;
}

function skip() {
  emit('skip');
}

function finish() {
  emit('done');
}

// Each step replaces the content focus was in, so it moves to the new heading
useMfaStepFocus(headingRef);

// A fresh flow on arrival, and nothing of this one left behind on leaving:
// done, skipped or signed out
onMounted(() => {
  resetMfa();
  if (autofocus) headingRef.value?.focus();
});

onUnmounted(resetMfa);
</script>

<template>
  <div class="mfa-setup">
    <component
      :is="`h${headingLevel}`"
      v-if="showIntro || mfaStep !== 1"
      ref="heading"
      tabindex="-1"
    >
      {{ heading }}
    </component>

    <!-- Without the intro text it only holds an error, so it only renders
         with one: an empty block would still take up room in the layout. -->
    <div
      v-if="mfaStep === 1 && (showIntro || mfaError)"
      class="mfa-setup-intro"
    >
      <p v-if="showIntro" class="mfa-setup-description">
        {{ $t('mfa.description') }}
      </p>

      <ErrorMessage :data="mfaError" />
    </div>

    <template v-else-if="mfaStep === 2">
      <MfaQr :heading-level="subheadingLevel" />

      <ErrorMessage :data="mfaError" />
    </template>

    <Form
      v-else-if="mfaStep === 3"
      :id="formId"
      class="mfa-setup-code"
      :autofocus-fn="() => codeInputRef?.focusElement()"
      @submit="confirm"
    >
      <MfaCode />
    </Form>

    <MfaEnableResult
      v-else-if="mfaStep === 4"
      :heading-level="subheadingLevel"
    />

    <div class="mfa-setup-actions">
      <Button
        v-if="skippable && (mfaStep === 1 || mfaStep === 2)"
        variant="ghost"
        size="lg"
        :label="$t('mfa.skip')"
        @click="skip"
      />

      <Button
        v-if="mfaStep === 3"
        variant="ghost"
        size="lg"
        icon="material-symbols:arrow-left-alt"
        :label="$t('general.back')"
        @click="back"
      />

      <Button
        v-if="mfaStep === 1"
        variant="black"
        size="lg"
        icon="material-symbols:lock-outline"
        :label="$t('mfa.enable')"
        :loading="loadingEnable"
        @click="enable"
      />

      <Button
        v-else-if="mfaStep === 2"
        variant="black"
        size="lg"
        icon="material-symbols:arrow-right-alt"
        icon-pos="end"
        :label="$t('general.continue')"
        @click="next"
      />

      <Button
        v-else-if="mfaStep === 3"
        type="submit"
        :form="formId"
        variant="black"
        size="lg"
        icon="material-symbols:check"
        :label="$t('general.confirm')"
        :disabled="!canConfirm"
        :loading="loadingConfirmationCode"
      />

      <Button
        v-else-if="mfaStep === 4"
        variant="black"
        size="lg"
        icon="material-symbols:arrow-right-alt"
        icon-pos="end"
        :label="$t('mfa.setup-finish')"
        @click="finish"
      />
    </div>

    <!-- Asked for by Fortify's `password.confirm` when MFA is enabled -->
    <PasswordConfirmationDialog />
  </div>
</template>

<style>
.mfa-setup {
  width: 100%;
  margin-inline: auto;

  /* The setup's own text; ErrorMessage keeps its error colour and size */
  p:not(.error-message p) {
    color: var(--color-grey-text);
    font-size: var(--font-size-md);
  }

  h2 {
    hyphens: none;
    margin-block: 0 1.5rem;
    font-size: var(--font-size-lg);
  }

  /* As the page title, the step heading keeps the app's own h1 size. */
  > h1 {
    text-align: center;
    hyphens: none;
    margin-block: 0 1.5rem;
  }

  .mfa-setup-description {
    max-width: 60ch;
  }

  .mfa-qr-code-wrapper {
    padding-inline: 0;
  }

  .mfa-code-input {
    width: 100%;
  }

  .mfa-recovery-codes-description {
    margin-inline: auto;
    text-align: center;
  }

  .mfa-setup-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    /* Centred while the buttons wrap onto their own lines on small screens */
    justify-content: center;
    margin-block-start: 1.5rem;
    padding-block-start: 1.5rem;
    border-block-start: 1px solid var(--color-grey-light);

    > :only-child {
      margin-inline: auto;
    }

    @media (min-width: 480px) {
      justify-content: space-between;
    }
  }
}
</style>
