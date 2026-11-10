<script setup lang="ts">
const { headingLevel = 2 } = defineProps<{
  /** Level of the "Recovery codes" heading: one below the title it sits under. */
  headingLevel?: 2 | 3 | 4;
}>();

const { recoveryCodes, mfaError } = useMfa();
</script>

<template>
  <div class="mfa-enable-result-content">
    <ErrorMessage v-if="mfaError" :data="mfaError" />

    <MfaRecoveryCodeList
      v-else-if="recoveryCodes.length"
      :heading-level="headingLevel"
    />

    <!-- MFA is on, but the codes did not come: a flow of an app's own that
         confirmed without reading them. New ones replace them. -->
    <p v-else class="mfa-recovery-codes-missing">
      {{
        $t('mfa.recovery-codes-missing', {
          action: $t('mfa.recovery-codes-regenerate'),
        })
      }}
    </p>
  </div>
</template>

<style>
.mfa-enable-result-content {
  display: grid;
}
</style>
