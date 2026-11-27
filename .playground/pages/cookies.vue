<script setup lang="ts">
useHead({ title: 'Cookie consent' });
</script>

<template>
  <div class="demo-page">
    <p class="demo-eyebrow">Actions</p>
    <h1>Cookie consent</h1>
    <p class="demo-lead">
      This page mounts CookiesDialog as soon as it loads, as a site does in its
      layout, so it shows what a visitor sees on a first visit: the dialog opens by itself
      until Accept or Deny is stored in a cookie, which holds for a year.
    </p>

    <section class="demo-section" aria-labelledby="cookies-google">
      <h2 id="cookies-google">Nothing for Google before Accept</h2>
      <p class="demo-hint">
        With <code>runtimeConfig.public.gtmId</code> set, CookiesDialog
        registers Google Tag Manager itself, behind a consent trigger: the
        script loads only after Accept, or on a later visit when the cookie
        says the visitor accepted. Before that nothing leaves the page for
        Google. Deny, also after an earlier Accept, sends a denied consent
        update to Tag Manager. A project never registers Tag Manager itself,
        since a second registration loads it at once; it sends its own events
        with <code>useCookiesDialog().pushDataLayer()</code>, which does nothing
        until the visitor has accepted.
      </p>
      <p class="demo-hint">
        The playground has no <code>gtmId</code>, so here nothing loads after
        Accept either. The browser suite builds it with one and answers Tag
        Manager's request itself.
      </p>
    </section>

    <section class="demo-section" aria-labelledby="cookies-again">
      <h2 id="cookies-again">Changing the choice</h2>
      <p class="demo-hint">
        CookiesButton opens the dialog again, and says in its name whether
        cookies are accepted. Escape closes the dialog without storing a choice,
        so on a first visit it opens again on the next page load.
      </p>

      <Card>
        <CookiesButton :hide-label="false" />
      </Card>
    </section>

    <CookiesDialog description="This cookies dialog is for demo purposes only." />
  </div>
</template>
