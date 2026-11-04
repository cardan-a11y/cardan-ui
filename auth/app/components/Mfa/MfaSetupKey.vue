<script setup lang="ts">
/**
 * The secret behind the QR code as text, for an authenticator app on the same
 * phone or one that cannot scan: copy it, or type it over.
 */
const { headingLevel = undefined } = defineProps<{
  /** Titles it "Setup key". Leave it off where a toggle already says so. */
  headingLevel?: 2 | 3 | 4;
}>();

const { setupKey } = useMfa();

/** In groups of four, the way authenticator apps show it: easier to type over. */
const groupedKey = computed(
  () => setupKey.value.match(/.{1,4}/g)?.join(' ') ?? '',
);
</script>

<template>
  <div class="mfa-setup-key">
    <component
      :is="`h${headingLevel}`"
      v-if="headingLevel"
      class="mfa-setup-key-heading"
    >
      {{ $t('mfa.setup-key') }}
    </component>

    <div class="mfa-setup-key-row">
      <p class="mfa-setup-key-value" translate="no">{{ groupedKey }}</p>

      <CopyButton
        :text="setupKey"
        :hide-label="false"
        :label="$t('mfa.setup-key-copy')"
        :disabled="!setupKey"
      />
    </div>

    <p class="mfa-setup-key-description">
      {{ $t('mfa.setup-key-description') }}
    </p>
  </div>
</template>

<style>
.mfa-setup-key {
  display: grid;
  gap: 0.75rem;

  .mfa-setup-key-heading {
    margin-block: 0;
    font-size: var(--font-size-md);
  }

  .mfa-setup-key-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem 1rem;
  }

  .mfa-setup-key-value {
    /* A line of key, held before it arrives so nothing below it jumps. */
    min-block-size: 1.6em;
    max-inline-size: 22ch;
    margin-block: 0;
    font-family: monospace;
    font-size: var(--font-size-sm);
    line-height: 1.6;
    letter-spacing: 0.04em;
    color: var(--color-text);
  }

  .mfa-setup-key-description {
    margin-block: 0;
    font-size: var(--font-size-sm);
  }
}
</style>
