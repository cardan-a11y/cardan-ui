<script setup lang="ts">
useHead({ title: 'Error page' });

// The examples are text here: Prettier formats a template literal in the
// template as HTML, and drops its indentation. Each is a fenced block for
// MarkdownPreview.
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

/** An error in the browser on this page itself, without a navigation */
function showServerError() {
  showError({ status: 500 });
}
</script>

<template>
  <div class="demo-page error-page-demo">
    <h1>Error page</h1>

    <p class="fs-md demo-description">
      What every app shows when a page cannot be shown: an address that does not
      exist, a page the user may not see, or an error on the server or in the
      browser. The layer has an <code>error.vue</code> of its own, which Nuxt
      uses whenever a project has none, so the four apps answer the same way, in
      the reader's language, with one way on.
    </p>

    <Card>
      <h2>Try it</h2>

      <p>
        Each link below opens the error page as an app shows it. A link to an
        address that no page matches makes the browser load that address from
        the server, as Nuxt does for any unknown address; the others come from a
        page that calls <code>showError()</code> in the browser, after the
        navigation. The button shows the error page right here, without leaving
        this page.
      </p>

      <!-- No prefetch: with ISR (production) Nuxt fetches each link's payload,
           which fails on purpose here and logs an error per link -->
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

    <Card>
      <h2>What it says</h2>

      <p>
        The page has a heading and a short text for each kind of error: a page
        that was not found (404 and 410), a page the user has no access to (401
        and 403), an error on the server (500 and up), and any other error. The
        heading is also the document's title, which the project's
        <code>titleTemplate</code> completes with the name of the app, and which
        the route announcer reads out. Below the text the status code follows,
        so a user can quote it to support.
      </p>

      <p>
        A page that knows more than the status, such as which item was not
        found, passes a text in the page's language in the error's
        <code>data</code>. It replaces the general text for the status. The
        <code>statusText</code> and the message of an error are not shown: they
        are written in English by a server or by Nuxt, and mostly repeat the
        status in other words. In development the page shows them anyway, in
        English, with the stack of the error, so the cause is in view while you
        work; a production build never shows them. No text of an error is ever
        rendered as HTML.
      </p>

      <MarkdownPreview :content="textExample" class="error-page-demo-code" />
    </Card>

    <Card>
      <h2>The way on</h2>

      <p>
        The page offers one way on, a real link. When there is a page to go back
        to, it goes back to it: an earlier page of the app in the browser's
        history, or a page of the same site that loaded this one, which is the
        case for an address no page matches, because Nuxt then loads it from the
        server. Otherwise, such as after a search engine or another site sent
        the reader here, it goes to the homepage, in the current language where
        the app has a prefix per language. The server always renders the link to
        the homepage, and the browser changes it to "back" once the page has
        loaded, so a cached page is the same for every reader. Going back to an
        earlier page of the app happens in the app, which clears the error and
        shows the page before. When the page's middleware refused the page the
        reader was going to, with a non-fatal error, Nuxt stops the navigation
        and the address stays on the page with the link: back then shows that
        page again. A page of the site that loaded this one is loaded again as a
        link instead: the browser does not say which entry comes before this one
        in its history, which may be another site, for instance after a page
        replaced itself with the missing address. Going home loads the homepage
        from the server: on an error page with no page before it, the visit has
        only just started, so nothing is lost, and nothing left of the page that
        failed can catch up with the reader. Such a page may still be waiting
        for its data when the reader moves on, and would show its error again on
        the next page once the data arrives. For the same reason the skip link
        moves focus to the main content itself, without adding
        <code>#main</code> to the address: to the router that would be a
        navigation, after which Nuxt clears the error and renders the page that
        failed once more.
      </p>
    </Card>

    <Card>
      <h2>Focus and the layout</h2>

      <p>
        The error page replaces <code>app.vue</code> entirely, so it shows its
        content in the route's layout: the layout a page sets, the
        <code>appLayout</code> a route rule sets, or <code>default</code>. That
        layout must hold the app's frame: AppShell, the header and
        <code>&lt;main&gt;</code>. On the error page
        <code>&lt;main&gt;</code> is the skip link's target,
        <code>id="main"</code> with <code>tabindex="-1"</code>, also in an app
        whose pages give it to their own content after their breadcrumbs.
        Whatever a project renders in <code>app.vue</code> itself is missing on
        the error page, and so is CSS that <code>app.vue</code> imports instead
        of <code>css</code> in <code>nuxt.config.ts</code>, and a
        <code>titleTemplate</code> that <code>app.vue</code> sets. With the
        frame in the layout, the error page behaves as any page after a
        navigation: AppShell announces its title and takes focus, so the next
        Tab is the skip link, also when the error shows on the page the user was
        on.
      </p>

      <MarkdownPreview :content="layoutExample" class="error-page-demo-code" />

      <p>
        The error page adds no spacing at its sides and 2.5rem above and 4rem
        below; a project sets <code>--error-page-padding-block</code> and
        <code>--error-page-padding-inline</code> to match its own pages. Page
        middleware may not have run when the page shows, and a plugin may have
        failed at the start, so the page reads nothing but the error: no
        signed-in user, no request to an API. Should @nuxtjs/i18n itself have
        failed, it shows its English text, marked as English.
      </p>
    </Card>

    <Card>
      <h2>ErrorPageContent</h2>

      <p>
        The content of the error page is a component of its own, for a page that
        answers an error itself without the error page, such as a
        server-rendered page that answers 404 and shows its "not found" text in
        its own layout. It takes the <code>status</code> and an optional
        <code>text</code>, sets the document title and offers the same way on.
        It renders the page's <code>&lt;h1&gt;</code>, so it is the only heading
        of its level on that page.
      </p>

      <MarkdownPreview :content="contentExample" class="error-page-demo-code" />
    </Card>
  </div>
</template>

<style>
.error-page-demo {
  .error-page-demo-list {
    display: grid;
    gap: 0.5rem;
    margin-block-end: 1.5rem;
  }

  .error-page-demo-code {
    margin-block-start: 1rem;
  }
}
</style>
