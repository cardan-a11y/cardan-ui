<script setup lang="ts">
const {
  clickOutside = false,
  position = 'block-end',
  closeButtonVariant = 'ghost',
  closeButtonRadius = 'full',
  acceptButtonVariant = 'primary',
  denyButtonVariant = 'ghost',
  ariaLabel = undefined,
  description = undefined,
  acceptButtonLabel = undefined,
  denyButtonLabel = undefined,
} = defineProps<{
  clickOutside?: boolean;
  position?: DialogPosition;
  closeButtonVariant?: ButtonVariant;
  closeButtonRadius?: BorderRadius;
  acceptButtonVariant?: ButtonVariant;
  denyButtonVariant?: ButtonVariant;
  ariaLabel?: string;
  description?: string;
  acceptButtonLabel?: string;
  denyButtonLabel?: string;
}>();

const {
  cookieConsent,
  consentCookie,
  cookiesDialogOpen,
  acceptCookies,
  denyCookies,
} = useCookiesDialog();

const dialogRef = useTemplateRef<DialogComponent>('dialog');

watch(cookiesDialogOpen, (open) => {
  if (open) dialogRef.value?.openDialog();
  else dialogRef.value?.closeDialog();
});

// Without @nuxt/scripts in a project, Nuxt's stubs type its composables `void`.
// These types can go once the layer registers @nuxt/scripts itself.
type ConsentCommand = [
  command: 'consent',
  type: 'default' | 'update',
  params: Record<string, 'granted' | 'denied'>,
];
interface ConsentTrigger extends Promise<void> {
  accept: () => void;
}
interface GoogleTagManager {
  proxy: { dataLayer: { push: (command: IArguments) => void } };
}

function useTagManager(id: string) {
  const consentTrigger = useScriptTriggerConsent() as unknown as ConsentTrigger;

  const gtm = useScriptGoogleTagManager({
    id,

    onBeforeGtmStart: (gtag: (...command: ConsentCommand) => void) => {
      gtag('consent', 'default', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
        functionality_storage: 'denied',
        personalization_storage: 'denied',
      });
    },

    scriptOptions: {
      trigger: consentTrigger,
    },
  }) as unknown as GoogleTagManager;

  // GTM only reads gtag commands from an Arguments object, not from an array
  function gtag(..._command: ConsentCommand) {
    // eslint-disable-next-line prefer-rest-params
    gtm.proxy.dataLayer.push(arguments);
  }

  function updateConsent(value: 'granted' | 'denied') {
    gtag('consent', 'update', {
      ad_user_data: value,
      ad_personalization: value,
      ad_storage: value,
      analytics_storage: value,
      functionality_storage: value,
      personalization_storage: value,
    });
  }

  return {
    grant() {
      updateConsent('granted');
      consentTrigger.accept();
    },
    // No remove(): before the script loaded it would cancel a later Accept in
    // this visit, and after, GTM keeps running anyway; the denied update tells
    // its consent-aware tags to hold back
    deny() {
      updateConsent('denied');
    },
  };
}

const { gtmId } = useRuntimeConfig().public;
const tagManager = gtmId ? useTagManager(gtmId) : undefined;

function isChoice(consent: typeof cookieConsent.value | null) {
  return (
    consent?.necessary === true &&
    typeof consent.analytics === 'boolean' &&
    consent.analytics === consent.marketing
  );
}

watch(
  cookieConsent,
  (consent) => {
    if (!tagManager || !isChoice(consent)) return;

    if (consent.analytics) tagManager.grant();
    else tagManager.deny();
  },
  { deep: true },
);

onMounted(() => {
  if (consentCookie.value) {
    cookieConsent.value = { ...consentCookie.value };
  }

  if (!isChoice(cookieConsent.value)) {
    cookiesDialogOpen.value = true;
  }

  if (cookiesDialogOpen.value) {
    dialogRef.value?.openDialog();
  }
});

onUnmounted(() => {
  cookiesDialogOpen.value = false;
});
</script>

<template>
  <Dialog
    ref="dialog"
    class="cookies-dialog"
    :position="position"
    :click-outside="clickOutside"
    :aria-label="ariaLabel || $t('cookies.heading')"
    :close-button-variant="closeButtonVariant"
    :close-button-radius="closeButtonRadius"
    @close="cookiesDialogOpen = false"
  >
    <template #header>
      <div class="cookies-dialog-content">
        <p id="cookiesDescription">
          {{ description || $t('cookies.description') }}
        </p>

        <div class="button-group">
          <Button
            class="accept-button"
            aria-describedby="cookiesDescription"
            :variant="acceptButtonVariant"
            size="lg"
            :label="acceptButtonLabel || $t('cookies.accept')"
            @click="acceptCookies"
          />

          <Button
            class="deny-button"
            aria-describedby="cookiesDescription"
            :variant="denyButtonVariant"
            size="lg"
            :label="denyButtonLabel || $t('cookies.deny')"
            @click="denyCookies"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<style>
.cookies-dialog {
  .dialog-header-wrapper {
    padding-inline-end: calc(var(--dialog-padding-inline) + 1.5rem);
  }

  .cookies-dialog-content {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    margin-inline: auto;
    justify-content: center;
    text-align: center;
    row-gap: 2rem;
    column-gap: 3rem;

    p {
      margin-block: 1em;
    }

    .button-group {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      justify-self: end;
      gap: 1rem;
    }
  }

  .close-button {
    top: 0.5em;
    right: 0.5em;

    @media (min-width: 768px) {
      top: 1.75rem;
      right: 1.5em;
    }
  }
}
</style>
