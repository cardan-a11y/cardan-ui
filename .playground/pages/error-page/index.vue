<script setup lang="ts">
useHead({ title: 'Error page' });

// Not in the template, where Prettier would format them as HTML
const fence = (lang: string, code: string) =>
  ['```' + lang, code, '```'].join('\n');

const layoutExample = fence(
  'html',
  `<!-- app/app.vue: the page in its layout, nothing around it -->
<NuxtLayout>
  <NuxtPage />
</NuxtLayout>

<!-- app/layouts/default.vue: the frame, also around the error page -->
<AppShell>
  <TheHeader />

  <main id="main" tabindex="-1">
    <slot />
  </main>
</AppShell>`,
);

const textExample = fence(
  'ts',
  `throw showError({
  status: 404,
  data: { text: t('audits.not-found') },
});`,
);

const contentExample = fence(
  'html',
  `<ErrorPageContent :status="404" :text="$t('catalog.not-found')" />`,
);

const rules = [
  {
    title: 'One page for every app',
    text: 'The layer has an error.vue of its own, which Nuxt uses whenever a project has none.',
  },
  {
    title: 'One way on',
    text: 'A real link: back to the page before, else to the homepage.',
  },
  {
    title: 'The frame is in the layout',
    text: 'The error page replaces app.vue, so AppShell, the header and <main> belong in the layout.',
  },
  {
    title: 'Only the error',
    text: 'It reads nothing but the error: no signed-in user, no request to an API.',
  },
];

function showServerError() {
  showError({ status: 500 });
}
</script>

<template>
  <div class="demo-page error-page-demo">
    <p class="demo-eyebrow">Layout</p>
    <h1>Error page</h1>
    <p class="demo-lead">
      What every app shows when a page cannot be shown: an address that does
      not exist, a page the user may not see, or an error on the server or in
      the browser. In the reader's language, with one way on.
    </p>

    <ul role="list" class="demo-grid">
      <li v-for="rule in rules" :key="rule.title" class="demo-tile">
        <strong>{{ rule.title }}</strong>
        <span>{{ rule.text }}</span>
      </li>
    </ul>

    <section class="demo-section" aria-labelledby="error-page-try">
      <h2 id="error-page-try">Try it</h2>
      <p class="demo-hint">
        Each link opens the error page as an app shows it. The button shows it
        right here, without leaving this page.
      </p>

      <Card>
        <ul class="error-page-demo-notes">
          <li>
            An address that no page matches makes the browser load it from the
            server, as Nuxt does for any unknown address.
          </li>
          <li>
            The other links go to a page that calls <code>showError()</code> in
            the browser, after the navigation.
          </li>
        </ul>

        <!-- No prefetch: under ISR each payload fetch fails and logs an error -->
        <ul class="error-page-demo-list">
          <li>
            <NuxtLink to="/this-page-does-not-exist" no-prefetch>
              A page that does not exist (404)
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/error-page/demo?status=404&text" no-prefetch>
              An item that was not found, with the page's own text (404)
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/error-page/demo?status=403" no-prefetch>
              A page you have no access to (403)
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/error-page/demo?refuse" no-prefetch>
              A page whose middleware refuses access (403)
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/error-page/demo?status=503" no-prefetch>
              An error on the server (503)
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/error-page/demo?status=429" no-prefetch>
              Any other error (429)
            </NuxtLink>
          </li>
        </ul>

        <Button
          label="Show an error on this page (500)"
          @click="showServerError"
        />
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="error-page-says">
      <h2 id="error-page-says">What it says</h2>
      <p class="demo-hint">
        A heading and a short text for each kind of error, then the status
        code, so a user can quote it to support.
      </p>

      <Card>
        <ul class="error-page-demo-notes">
          <li>
            Four kinds: a page that was not found (404 and 410), a page the
            user has no access to (401 and 403), an error on the server (500
            and up), and any other error.
          </li>
          <li>
            The heading is also the document's title, which the project's
            <code>titleTemplate</code> completes with the name of the app, and
            which the route announcer reads out.
          </li>
          <li>
            A page that knows more than the status, such as which item was not
            found, passes a text in the page's language in the error's
            <code>data</code>. It replaces the general text for the status.
          </li>
          <li>
            The <code>statusText</code> and the message of an error are not
            shown: a server or Nuxt writes them in English, and they mostly
            repeat the status.
          </li>
          <li>
            In development the page shows them anyway, with the stack of the
            error. A production build never does.
          </li>
          <li>No text of an error is ever rendered as HTML.</li>
        </ul>

        <MarkdownPreview :content="textExample" class="error-page-demo-code" />
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="error-page-way-on">
      <h2 id="error-page-way-on">The way on</h2>
      <p class="demo-hint">
        One real link. It goes back when there is a page to go back to, and to
        the homepage otherwise.
      </p>

      <Card>
        <h3>Where it goes</h3>
        <ul class="error-page-demo-notes">
          <li>
            Back to an earlier page of the app in the browser's history. That
            happens in the app, which clears the error and shows the page
            before.
          </li>
          <li>
            Back to a page of the same site that loaded this one, which is the
            case for an address no page matches. That page is loaded again as a
            link: the browser does not say which entry comes before this one in
            its history, which may be another site.
          </li>
          <li>
            Otherwise to the homepage, such as after a search engine or another
            site sent the reader here, in the current language where the app
            has a prefix per language.
          </li>
          <li>
            After middleware refused a page with a non-fatal error, Nuxt stops
            the navigation and the address stays on the page with the link:
            back then shows that page again.
          </li>
        </ul>

        <h3>Why it works this way</h3>
        <ul class="error-page-demo-notes">
          <li>
            The server always renders the link to the homepage, and the browser
            changes it to "back" once the page has loaded, so a cached page is
            the same for every reader.
          </li>
          <li>
            Going home loads the homepage from the server. With no page before
            it, the visit has only just started, so nothing is lost, and
            nothing left of the page that failed can catch up with the reader:
            a page still waiting for its data would show its error again on the
            next page once the data arrives.
          </li>
          <li>
            For the same reason the skip link moves focus to the main content
            itself, without adding <code>#main</code> to the address. To the
            router that would be a navigation, after which Nuxt clears the
            error and renders the page that failed once more.
          </li>
        </ul>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="error-page-layout">
      <h2 id="error-page-layout">Focus and the layout</h2>
      <p class="demo-hint">
        The error page replaces <code>app.vue</code> entirely and shows its
        content in the route's layout, so that layout must hold the app's
        frame: AppShell, the header and <code>&lt;main&gt;</code>.
      </p>

      <Card>
        <ul class="error-page-demo-notes">
          <li>
            The route's layout is the layout a page sets, the
            <code>appLayout</code> a route rule sets, or <code>default</code>.
          </li>
          <li>
            On the error page <code>&lt;main&gt;</code> is the skip link's
            target, <code>id="main"</code> with <code>tabindex="-1"</code>,
            also in an app whose pages give it to their own content after their
            breadcrumbs.
          </li>
          <li>
            Missing on the error page: whatever a project renders in
            <code>app.vue</code> itself, CSS that <code>app.vue</code> imports
            instead of <code>css</code> in <code>nuxt.config.ts</code>, and a
            <code>titleTemplate</code> that <code>app.vue</code> sets.
          </li>
          <li>
            With the frame in the layout, the error page behaves as any page
            after a navigation: AppShell announces its title and takes focus,
            so the next Tab is the skip link, also when the error shows on the
            page the user was on.
          </li>
        </ul>

        <MarkdownPreview
          :content="layoutExample"
          class="error-page-demo-code"
        />

        <h3>Spacing and what it reads</h3>
        <ul class="error-page-demo-notes">
          <li>
            The error page adds no spacing at its sides and 2.5rem above and
            4rem below. A project sets
            <code>--error-page-padding-block</code> and
            <code>--error-page-padding-inline</code> to match its own pages.
          </li>
          <li>
            Page middleware may not have run when the page shows, and a plugin
            may have failed at the start, so the page reads nothing but the
            error: no signed-in user, no request to an API.
          </li>
          <li>
            Should @nuxtjs/i18n itself have failed, it shows its English text,
            marked as English.
          </li>
        </ul>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="error-page-content">
      <h2 id="error-page-content">ErrorPageContent</h2>
      <p class="demo-hint">
        The content of the error page as a component, for a page that answers
        an error itself, such as a server-rendered page that answers 404 and
        shows its "not found" text in its own layout.
      </p>

      <Card>
        <ul class="error-page-demo-notes">
          <li>
            It takes the <code>status</code> and an optional <code>text</code>,
            sets the document title and offers the same way on.
          </li>
          <li>
            It renders the page's <code>&lt;h1&gt;</code>, so it is the only
            heading of its level on that page.
          </li>
        </ul>

        <MarkdownPreview
          :content="contentExample"
          class="error-page-demo-code"
        />
      </Card>
    </section>
  </div>
</template>

<style>
.error-page-demo {
  .card {
    margin-block-end: 0;

    h3 {
      margin-block: 2rem 0.75rem;
      font-size: var(--font-size-md);

      &:first-child {
        margin-block-start: 0;
      }
    }
  }

  .error-page-demo-notes {
    margin-block: 0 1.5rem;

    &:last-child {
      margin-block-end: 0;
    }
  }

  .error-page-demo-list {
    display: grid;
    gap: 0.5rem;
    margin-block-end: 1.5rem;
  }

  .error-page-demo-code {
    margin-block: 1rem 0;
  }
}
</style>
