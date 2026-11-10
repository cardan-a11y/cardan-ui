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
    <h1>Breadcrumbs</h1>

    <blockquote>
      <p class="fs-md">
        A breadcrumb trail consists of a list of links to the parent pages of
        the current page in hierarchical order. It helps users find their place
        within a website or web application.
      </p>

      <p class="fs-sm mbe-2 c-grey-text">
        Source:
        <Button
          label="ARIA Design Patterns"
          to="https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb"
          variant="link"
          target="_blank"
        />
      </p>
    </blockquote>

    <Card>
      <h2>Trail</h2>

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

    <Card>
      <h2>A long trail</h2>

      <p class="fs-sm c-grey-text">
        The trail wraps where it runs out of room, and a long title breaks
        inside its own item. These items are Dutch on an English page, so each
        has a <code>lang</code>.
      </p>

      <Breadcrumbs :items="longTrail" label="Breadcrumb, long trail" />
    </Card>

    <Card>
      <h2>Accessibility requirements</h2>

      <ul class="a11y-list">
        <li>
          The trail is a <code>nav</code> landmark with a name: "Breadcrumb" in
          the page's language, or the <code>label</code> prop. Two trails on a
          page need different names.
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
          The slash between the items is decoration. It is CSS generated content
          with an empty alternative text (<code>content: '/' / ''</code>), so a
          screen reader does not read it.
        </li>

        <li>
          An item in another language than the page has a
          <code>lang</code>.
        </li>
      </ul>
    </Card>
  </div>
</template>

<style>
.breadcrumbs-page {
  .card + .card {
    margin-block-start: 1.5rem;
  }

  .card > code {
    display: block;
    margin-block-start: 1rem;
    overflow-wrap: anywhere;
  }
}
</style>
