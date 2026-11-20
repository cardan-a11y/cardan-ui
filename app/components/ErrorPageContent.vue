<script lang="ts">
/** The texts for when @nuxtjs/i18n failed to start: en.json's `error-page` */
export const errorPageFallback = {
  back: 'Back to the previous page',
  home: 'Go to the homepage',
  status: 'Error code {status}',
  'not-found': {
    heading: 'Page not found',
    text: 'The address may be mistyped, or the page has moved or no longer exists.',
  },
  'no-access': {
    heading: 'No access',
    text: 'You are not signed in, or your account has no access to this page.',
  },
  server: {
    heading: 'Something went wrong',
    text: 'This is an error on our side. Please try again later.',
  },
  other: {
    heading: 'This page cannot be shown',
    text: 'Something went wrong while opening this page. Please try again later.',
  },
};

/** Which text a status gets: one per kind of error */
export function errorPageKind(status: number) {
  if (status === 404 || status === 410) return 'not-found';
  if (status === 401 || status === 403) return 'no-access';
  if (status >= 500) return 'server';
  return 'other';
}
</script>

<script setup lang="ts">
/**
 * What an error page says: a heading and text for `status` (also the document
 * title), the status code and one link on: back to the page before when there
 * is one (Vue Router's `history.state.back`, a same-origin referrer), else
 * home. `text` replaces the status's text, in the page's language; `error`'s
 * statusText, message and stack show in development only.
 */
const {
  status = 500,
  text = undefined,
  error = undefined,
} = defineProps<{
  status?: number;
  text?: string;
  error?: { statusText?: string; message?: string; stack?: string };
}>();

const nuxtApp = useNuxtApp();
const router = useRouter();

// Not `useI18n()`, which throws when i18n did not start
const i18n = nuxtApp.$i18n as typeof nuxtApp.$i18n | undefined;

function t(key: string, values: Record<string, unknown> = {}): string {
  if (i18n) return i18n.t(`error-page.${key}`, values);

  const message = key
    .split('.')
    .reduce<unknown>(
      (messages, part) => (messages as Record<string, unknown>)?.[part],
      errorPageFallback,
    );

  return String(message ?? key).replace(/\{(\w+)\}/g, (_, name) =>
    String(values[name]),
  );
}

const kind = computed(() => errorPageKind(status));
const heading = computed(() => t(`${kind.value}.heading`));

useHead({ title: heading });

const localeHome = computed(
  () => (i18n && nuxtApp.$localePath?.({ path: '/' })) || '/',
);

const previous = ref<{ href: string; via: 'history' | 'error' | 'link' }>();

function sameSiteReferrer() {
  try {
    const url = new URL(document.referrer);
    const here = window.location;

    return url.origin === here.origin &&
      url.pathname + url.search !== here.pathname + here.search
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

// A task after mount: the first render matches the server's HTML, and Nuxt
// pushes an address middleware refused to the history after this mounts
let findTimer: ReturnType<typeof setTimeout> | undefined;
onMounted(() => (findTimer = setTimeout(findPrevious)));
onBeforeUnmount(() => clearTimeout(findTimer));

function findPrevious() {
  const refusedFrom = (
    useError().value as Record<symbol, unknown> | undefined
  )?.[Symbol.for('cardan-ui:stopped-navigation')];
  const { pathname, search, hash } = window.location;
  if (
    typeof refusedFrom === 'string' &&
    router.resolve(refusedFrom).href === pathname + search + hash
  ) {
    previous.value = { href: router.resolve(refusedFrom).href, via: 'error' };
    return;
  }

  const back: unknown = window.history.state?.back;

  if (typeof back === 'string') {
    previous.value = { href: router.resolve(back).href, via: 'history' };
    return;
  }

  const referrer = sameSiteReferrer();
  if (referrer) previous.value = { href: referrer, via: 'link' };
}

const href = computed(
  () => previous.value?.href ?? router.resolve(localeHome.value).href,
);

function follow(event: MouseEvent) {
  const via = previous.value?.via;
  if (
    !via ||
    via === 'link' ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;

  event.preventDefault();

  if (via === 'error') {
    nuxtApp.runWithContext(() => clearError());
    return;
  }

  router.back();
}

const details = computed(() => {
  if (!import.meta.dev || !error) return '';

  const stack = error.stack ?? '';
  const message =
    error.message && !stack.includes(error.message) ? error.message : '';

  return [error.statusText, message, stack].filter(Boolean).join('\n');
});
</script>

<template>
  <div class="error-page-content" :lang="i18n ? undefined : 'en'">
    <h1>{{ heading }}</h1>

    <p>{{ text ?? t(`${kind}.text`) }}</p>

    <p class="error-page-content-status">{{ t('status', { status }) }}</p>

    <p>
      <a :href="href" class="error-page-content-link" @click="follow">
        <Icon
          :name="
            previous
              ? 'material-symbols:arrow-left-alt-rounded'
              : 'material-symbols:home-outline-rounded'
          "
        />
        {{ previous ? t('back') : t('home') }}
      </a>
    </p>

    <pre v-if="details" lang="en" class="error-page-content-details">{{
      details
    }}</pre>
  </div>
</template>

<style>
.error-page-content {
  display: grid;
  justify-items: start;
  gap: 1rem;

  > * {
    margin-block: 0;
  }

  .error-page-content-status {
    font-size: var(--font-size-sm);
  }

  .error-page-content-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-block-start: 1rem;
  }

  /* Wrapped, not scrolled: a scrolling <pre> would need a tab stop */
  .error-page-content-details {
    max-width: 100%;
    margin-block-start: 1.5rem;
    font-size: var(--font-size-xs);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
}
</style>
