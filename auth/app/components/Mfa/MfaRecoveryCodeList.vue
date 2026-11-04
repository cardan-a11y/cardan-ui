<script setup lang="ts">
const { headingLevel = undefined } = defineProps<{
  /**
   * Titles the card "Recovery codes" with a heading of this level. Leave it
   * off where the surrounding title already says so, as in a dialog about them.
   */
  headingLevel?: 2 | 3 | 4;
}>();

const { recoveryCodes } = useMfa();

const headingRef = useTemplateRef<HTMLElement>('heading');

defineExpose({
  /** Moves focus to the heading, for a caller that just replaced the content focus was in. */
  focusHeading: () => headingRef.value?.focus(),
});
</script>

<template>
  <div class="mfa-recovery-code-list">
    <Card background-color="bg" class="mfa-recovery-codes-card">
      <component
        :is="`h${headingLevel}`"
        v-if="headingLevel"
        ref="heading"
        tabindex="-1"
        class="mfa-recovery-codes-heading"
      >
        {{ $t('mfa.recovery-code', 2) }}
      </component>

      <ul role="list">
        <li v-for="code in recoveryCodes" :key="code">{{ code }}</li>
      </ul>

      <CopyButton
        :text="recoveryCodes.join('\n')"
        :hide-label="false"
        :label="$t('mfa.recovery-codes-copy')"
      />
    </Card>

    <p class="mfa-recovery-codes-description">
      {{ $t('mfa.recovery-code-description') }}
    </p>
  </div>
</template>

<style>
.mfa-recovery-code-list {
  container-type: inline-size;

  .mfa-recovery-codes-description {
    margin-block: 1rem 0;
  }
}

.mfa-recovery-codes-card {
  margin-inline: auto;

  .mfa-recovery-codes-heading {
    margin-block: 0 0.75rem;
    font-size: var(--font-size-md);
  }

  ul {
    display: grid;
    /*
     * Fortify recovery codes are always 21 characters, so in this monospace
     * font 21ch is exactly one code: two columns when two codes fit side by
     * side, one otherwise, and never a code broken across lines.
     */
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 21ch), 1fr));
    column-gap: 1.5rem;
    white-space: nowrap;
    font-family: monospace;
    font-size: var(--font-size-sm);
    color: var(--color-grey-text);
  }

  .copy-button {
    margin-block-start: 1rem;
  }

  /*
   * On small screens the codes stack in one column and the whole card centres
   * around it. One column is forced here so the card never centres two.
   */
  @container (max-width: 426px) {
    text-align: center;

    ul {
      grid-template-columns: 1fr;
    }
  }
}
</style>
