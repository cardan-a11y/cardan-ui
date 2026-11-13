<script lang="ts">
/**
 * The English of the texts, for an error page after @nuxtjs/i18n itself
 * failed to start. The same as `error-page` in i18n/locales/en.json, which a
 * test holds it to.
 */
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
 * What an error page says: a heading and a text for its status, in the
 * page's language and as the document title, the status code, and one way
 * on. The layer's `error.vue` shows it in the app's layout; a page that
 * answers an error itself, such as a 404 it renders, shows it too.
 *
 * The way on is a real link. The server renders it to the homepage (the
 * locale's, from @nuxtjs/i18n); in the browser it becomes "back" when there
 * is a page to go back to: an earlier page of this app in the history (Vue
 * Router's `history.state.back`), or a page of this site that led here with
 * a full page load (a same-origin `document.referrer`: Nuxt loads an address
 * no route matches from the server). A search engine or another site is no
 * page to go back to. Back to the app's page goes back in the history, and
 * the router clears the error; a referrer is loaded as a link. When page
 * middleware refused the page the user was going to, Nuxt stops the
 * navigation, the address stays on the page with the link, and back clears
 * the error to show that page again. Home is a full page load: on an error page without a page
 * before, nothing is lost, and nothing of the page that failed (an await in
 * its setup that throws again later) can overtake it.
 *
 * `text` is a text in the page's language that says more than the status,
 * such as which item was not found; it replaces the status's own text. A
 * server's or Nuxt's `statusText` and message are English and mostly repeat
 * the status: they show in development only, with the stack (`error`).
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

// Read from the app, not `useI18n()`, which throws when i18n did not start
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

/** The homepage, in the current locale where the app has prefixed routes */
const home = computed(
  () => (i18n && nuxtApp.$localePath?.({ path: '/' })) || '/',
);

/** Where the way on leads: home, until the browser finds a page before */
const previous = ref<{ href: string; via: 'history' | 'error' | 'link' }>();

/** A page of this site that loaded this one, other than this one */
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

// After mount: the server knows neither, and the first render matches its
// HTML. A task later: after a fatal error in middleware, Nuxt adds the
// refused address to the history after the error page has mounted.
let findTimer: ReturnType<typeof setTimeout> | undefined;
onMounted(() => (findTimer = setTimeout(findPrevious)));
onBeforeUnmount(() => clearTimeout(findTimer));

function findPrevious() {
  // Middleware refused the page the user was going to: the address never
  // left the page with the link (the error-origin plugin)
  const stopped = (useError().value as Record<symbol, unknown> | undefined)?.[
    Symbol.for('cardan-ui:stopped-navigation')
  ];
  const { pathname, search, hash } = window.location;
  if (
    typeof stopped === 'string' &&
    router.resolve(stopped).href === pathname + search + hash
  ) {
    previous.value = { href: router.resolve(stopped).href, via: 'error' };
    return;
  }

  const back: unknown = window.history.state?.back;

  if (typeof back === 'string') {
    previous.value = { href: router.resolve(back).href, via: 'history' };
    return;
  }

  // Loaded again, not back in the history: the entry before need not be the
  // referrer (a `location.replace()`, a new tab)
  const referrer = sameSiteReferrer();
  if (referrer) previous.value = { href: referrer, via: 'link' };
}

const href = computed(
  () => previous.value?.href ?? router.resolve(home.value).href,
);

/**
 * Back in the history, to the app's own page before, or to the page the app
 * is still on. Home, a referrer and a click that opens a new tab or window
 * are the browser's own.
 */
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
    // The page under the error, which rendered before it
    nuxtApp.runWithContext(() => clearError());
    return;
  }

  // Nuxt clears the error once the router has gone back
  router.back();
}

/** Development only: what was thrown, in English, with its stack */
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

  /* Wrapped rather than scrolled: no keyboard stop, nothing off screen */
  .error-page-content-details {
    max-width: 100%;
    margin-block-start: 1.5rem;
    font-size: var(--font-size-xs);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
}
</style>
