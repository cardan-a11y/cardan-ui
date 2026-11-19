<script setup lang="ts">
/**
 * Connects an authenticator app: the QR code on a desktop, a link that opens
 * the app on a phone, with the setup key (and on a phone the QR code) as toggles.
 */

const { headingLevel = 2 } = defineProps<{
  /** Level of the "Authenticator app" heading, one below the step heading */
  headingLevel?: 2 | 3 | 4;
}>();

const { getQrCode, qrCode, qrCodeUrl, mfaError } = useMfa();

const isHandheld = useMediaQuery('(pointer: coarse) and (max-width: 479px)');

onMounted(() => getQrCode());
</script>

<template>
  <div class="mfa-qr" :class="{ 'is-handheld': isHandheld }">
    <template v-if="isHandheld">
      <div class="mfa-qr-app-link">
        <Button
          :href="qrCodeUrl || undefined"
          external
          variant="black"
          size="xl"
          font-size="xs"
          icon-size="md"
          icon="material-symbols:add-to-home-screen-outline-rounded"
          :label="$t('mfa.add-to-app')"
          :loading="!qrCodeUrl && !mfaError"
        />
      </div>

      <details class="mfa-setup-key-section">
        <summary class="mfa-qr-toggle">
          {{ $t('mfa.setup-key-toggle-handheld') }}
          <Icon name="material-symbols:expand-more-rounded" mode="svg" />
        </summary>

        <Card background-color="bg" class="mfa-setup-key-card">
          <MfaSetupKey />
        </Card>
      </details>
    </template>

    <component :is="isHandheld ? 'details' : 'div'" class="mfa-qr-code-section">
      <summary v-if="isHandheld" class="mfa-qr-toggle">
        {{ $t('mfa.qr-toggle') }}
        <Icon name="material-symbols:expand-more-rounded" mode="svg" />
      </summary>

      <div class="mfa-qr-code-wrapper">
        <!-- Inline, not an <img>, so CSS recolours it in dark mode; sanitized in `getQrCode()` -->
        <!-- eslint-disable vue/no-v-html -->
        <div
          :role="qrCode ? 'img' : undefined"
          :aria-label="qrCode ? $t('mfa.qr-code-alt') : undefined"
          class="qr-code-wrapper"
          v-html="qrCode"
        />
        <!-- eslint-enable vue/no-v-html -->

        <div class="qr-code-description">
          <component :is="`h${headingLevel}`" class="qr-code-heading">
            {{ $t('mfa.qr') }}
          </component>
          <p>{{ $t('mfa.qr-description') }}</p>
        </div>
      </div>
    </component>

    <details v-if="!isHandheld" class="mfa-setup-key-details">
      <summary class="mfa-qr-toggle">
        {{ $t('mfa.setup-key-toggle') }}
        <Icon name="material-symbols:expand-more-rounded" mode="svg" />
      </summary>

      <MfaSetupKey />
    </details>
  </div>
</template>

<style>
.mfa-qr {
  display: grid;
  gap: 1.25rem;

  .mfa-qr-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding-block: 0.75rem;
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-sm);
    cursor: pointer;
    list-style: none;

    &::-webkit-details-marker {
      display: none;
    }

    /* mode="svg": a mask icon leaves a faint box around it while it turns */
    .iconify {
      flex-shrink: 0;
      font-size: 1.25em;
      transition: rotate var(--duration-sm);
    }
  }

  details[open] > .mfa-qr-toggle .iconify {
    rotate: 180deg;
  }

  .mfa-setup-key-details {
    border-radius: var(--radius-md);
    padding-inline: 1rem;
    background-color: var(--color-bg);

    &[open] {
      padding-block-end: 1rem;
    }
  }

  &.is-handheld {
    gap: 0.5rem;
    text-align: center;

    .mfa-qr-app-link {
      display: grid;
      gap: 0.5rem;

      .button {
        justify-content: center;
        inline-size: 100%;
        padding-inline: 0.25rem;

        .button-text {
          padding-block: 0.5rem;
        }
      }

      p {
        margin-block: 0;
        font-size: var(--font-size-sm);
      }
    }

    .mfa-qr-app-link {
      margin-block-end: 0.75rem;
    }

    .mfa-setup-key-row {
      flex-direction: column;
    }

    .mfa-qr-toggle {
      justify-content: center;
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }

    .mfa-qr-code-wrapper {
      margin-block-start: 0.5rem;
    }
  }
}

.mfa-qr-code-wrapper {
  display: grid;
  padding: 1rem;
  row-gap: 1.5rem;
  column-gap: 1.75rem;

  @media (min-width: 480px) {
    display: flex;
  }

  .qr-code-description {
    text-align: center;

    @media (min-width: 480px) {
      text-align: start;
    }

    .qr-code-heading {
      font-size: var(--font-size-md);
      margin-block-end: 0.5rem;
    }

    p {
      font-size: var(--font-size-sm);
      margin-block: 0;
      text-wrap: balance;
    }
  }

  .qr-code-wrapper {
    /* Scanners need dark on light, in dark mode too; the border is the quiet zone */
    --qr-light: var(--color-card-bg);
    --qr-dark: var(--color-text);

    display: grid;
    border-radius: var(--radius-md);
    border: 1rem solid var(--color-grey-bg);
    min-height: 192px;
    max-height: 192px;
    min-width: 192px;
    max-width: 192px;
    margin-inline: auto;

    svg {
      border-radius: var(--radius-sm);
      /* Scales with the box instead of keeping Fortify's fixed 192px height */
      max-width: 100%;
      height: auto;

      rect {
        fill: var(--qr-light);
      }

      path {
        fill: var(--qr-dark);
      }
    }
  }
}

.dark-mode .mfa-qr-code-wrapper .qr-code-wrapper {
  --qr-light: var(--color-text);
  --qr-dark: var(--color-card-bg);
}
</style>
