<script setup lang="ts">
useHead({ title: 'Breadcrumbs' });

const trail: BreadcrumbItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Tabs', to: '/tabs' },
  { label: 'Breadcrumbs' },
];

const longTrail: BreadcrumbItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Kennisbank', to: '/text', lang: 'nl' },
  { label: 'Webinars digitale toegankelijkheid', to: '/video', lang: 'nl' },
  {
    label:
      'Hoe volwassen is je organisatie in digitale toegankelijkheid? Webinar Accessibility Maturity Model',
    lang: 'nl',
  },
];
</script>

<template>
  <div class="demo-page breadcrumbs-page">
    <p class="demo-eyebrow">Layout</p>
    <h1>Breadcrumbs</h1>
    <p class="demo-lead">
      A trail of links to the parent pages of the current page, so a user sees
      where the page sits in the site. It follows the APG
      <Button
        label="breadcrumb"
        to="https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb"
        variant="link"
        target="_blank"
      />
      pattern.
    </p>

    <section class="demo-section" aria-labelledby="breadcrumbs-trail">
      <h2 id="breadcrumbs-trail">Trail</h2>
      <p class="demo-hint">
        <code>items</code> is the trail in order, home included. The last item
        is the current page and needs no <code>to</code>.
      </p>

      <Card>
        <Breadcrumbs :items="trail" />

        <code
          >{{ `<Breadcrumbs
            :items="[
              { label: 'Home', to: '/' },
              { label: 'Tabs', to: '/tabs' },
              { label: 'Breadcrumbs' },
            ]"
          />` }}</code
        >
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="breadcrumbs-long">
      <h2 id="breadcrumbs-long">A long trail</h2>
      <p class="demo-hint">
        The trail wraps where it runs out of room, and a long title breaks
        inside its own item. These items are Dutch on an English page, so each
        has a <code>lang</code>.
      </p>

      <Card>
        <Breadcrumbs :items="longTrail" label="Breadcrumb, long trail" />
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="breadcrumbs-a11y">
      <h2 id="breadcrumbs-a11y">Accessibility requirements</h2>

      <Card>
        <ul class="a11y-list">
          <li>
            The trail is a <code>nav</code> landmark with a name: "Breadcrumb"
            in the page's language, or the <code>label</code> prop. Two trails
            on a page need different names.
          </li>

          <li>
            The links are in an ordered list, so a screen reader says how many
            steps the trail has.
          </li>

          <li>
            The last item is the current page: text with
            <code>aria-current="page"</code>, not a link to the page you are on.
          </li>

          <li>
            The slash between the items is decoration. It is CSS generated
            content with an empty alternative text
            (<code>content: '/' / ''</code>), so a screen reader does not read
            it.
          </li>

          <li>
            An item in another language than the page has a
            <code>lang</code>.
          </li>
        </ul>
      </Card>
    </section>
  </div>
</template>

<style>
.breadcrumbs-page {
  .card {
    margin-block-end: 0;
  }

  .card > code {
    display: block;
    margin-block-start: 1rem;
    overflow-wrap: anywhere;
  }

  .a11y-list {
    margin-block: 0;
  }
}
</style>
