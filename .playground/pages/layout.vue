<script setup lang="ts">
useHead({ title: 'App layout' });

const demoNav: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'material-symbols:dashboard-outline-rounded',
  },
  {
    id: 'progress',
    label: 'My progress',
    icon: 'material-symbols:check-circle-outline-rounded',
  },
  {
    id: 'catalog',
    label: 'Catalog',
    icon: 'material-symbols:storefront-outline-rounded',
  },
  {
    id: 'account',
    label: 'My account',
    icon: 'material-symbols:account-circle-outline',
  },
];

const sections = [
  'Perceivable',
  'Operable',
  'Understandable',
  'Robust',
  'Text alternatives',
  'Time-based media',
  'Adaptable',
  'Distinguishable',
  'Keyboard accessible',
  'Enough time',
  'Seizures and physical reactions',
  'Navigable',
  'Input modalities',
  'Readable',
  'Predictable',
  'Input assistance',
  'Compatible',
];

const rules = [
  {
    title: 'The frame is in the layout',
    text: 'AppShell, the header and <main> go in the layout, not in app.vue, so the error page has them too.',
  },
  {
    title: 'One skip target',
    text: 'Exactly one element per page has id="main" and tabindex="-1", past everything that repeats.',
  },
  {
    title: 'Spacing inside the columns',
    text: 'A page’s spacing above and below belongs in the columns of a SidebarLayout, never on a wrapper.',
  },
  {
    title: 'One condition to stick',
    text: 'Everything sticky shares AppHeader’s condition: 360px wide and 480px high.',
  },
];

const search = ref('');
const onlyOpen = ref(false);

// Not in the template, where Prettier would format them as HTML
const htmlFence = (code: string) => ['```html', code, '```'].join('\n');

const shellExample =
  htmlFence(`<!-- app/layouts/default.vue: also around the error page -->
<AppShell>
  <AppHeader>…</AppHeader>

  <main id="main" tabindex="-1">
    <slot />
  </main>
</AppShell>`);

const headerExample = htmlFence(`<AppHeader>
  <template #start>
    <MobileMenu :list="navList" />
    <CardanLogo product="auditor" />
  </template>

  <MenuList :list="navList" inline button-variant="topbar" />

  <template #end>
    <UserMenu />
  </template>
</AppHeader>`);

const sidebarExample = htmlFence(`<AppSidebar collapsible>
  <template #header>
    <CardanLogo product="academy" />
  </template>

  <MenuList :list="navList" button-variant="sidebar" />
</AppSidebar>`);

const layoutExample = htmlFence(`<SidebarLayout sticky beside="xl">
  …

  <template #side>
    <aside aria-label="Filters">…</aside>
  </template>
</SidebarLayout>`);

const orderLines = Array.from({ length: 24 }, (_, i) => ({
  title: `Training ${i + 1}`,
  price: `€${(i + 1) * 25}`,
}));
const orderTotal = `€${orderLines.length * (orderLines.length + 1) * 12.5}`;

const orderExample = htmlFence(`<SidebarLayout sticky side-label="Your order">
  …

  <template #side>
    <h3>Your order</h3>
    <dl>…</dl>
  </template>
</SidebarLayout>`);
</script>

<template>
  <div class="demo-page layout-page">
    <p class="demo-eyebrow">Layout</p>
    <h1>App layout</h1>
    <p class="demo-lead">
      The parts every Cardan app builds its pages in. They hold the rules that
      are easy to get wrong (what sticks where, what scrolls on its own, where
      focus goes after a navigation) and leave the look to the app. This
      playground uses all four.
    </p>

    <ul role="list" class="demo-grid">
      <li v-for="rule in rules" :key="rule.title" class="demo-tile">
        <strong>{{ rule.title }}</strong>
        <span>{{ rule.text }}</span>
      </li>
    </ul>

    <section class="demo-section" aria-labelledby="layout-shell">
      <h2 id="layout-shell">AppShell</h2>
      <p class="demo-hint">
        The wrapper around the header, the navigation and the pages. It has no
        layout of its own.
      </p>

      <Card>
        <ul class="layout-notes">
          <li>
            It announces a new page to screen readers and puts the skip link
            first.
          </li>
          <li>
            It takes focus after a navigation to another page, and when the
            <NuxtLink to="/error-page">error page</NuxtLink> replaces the app,
            so the next Tab is the skip link.
          </li>
          <li>
            Focus the new page moves into its <code>&lt;main&gt;</code> itself
            stays there (a code field, a heading), and an address with a hash
            focuses the element it names (<code>useHashFocus()</code>).
          </li>
          <li>
            The skip link's target is exactly one element per page with
            <code>id="main"</code> and <code>tabindex="-1"</code>, past
            everything that repeats from page to page (WCAG 2.4.1): the app's
            <code>&lt;main&gt;</code>, or, where breadcrumbs or tabs repeat at
            the top of the pages, the page's own content after them.
          </li>
        </ul>

        <MarkdownPreview :content="shellExample" class="layout-demo-code" />
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="layout-header">
      <h2 id="layout-header">AppHeader</h2>
      <p class="demo-hint">
        The bar at the top, with the page loading indicator: the menu button
        and the logo in <code>start</code>, the navigation in the default slot
        and the user menu in <code>end</code>.
      </p>

      <Card>
        <ul class="layout-notes">
          <li>
            It stays in view from 360px wide and 480px high. On a smaller or
            lower screen, or zoomed in, it scrolls along.
          </li>
          <li>
            Its height is <code>--app-header-height</code> plus its line.
          </li>
          <li>
            Its look: <code>--app-header-bg</code>,
            <code>--app-header-border-color</code>,
            <code>--app-header-max-width</code> and
            <code>--app-header-gap</code>.
          </li>
        </ul>

        <MarkdownPreview :content="headerExample" class="layout-demo-code" />
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="layout-sidebar">
      <h2 id="layout-sidebar">AppSidebar</h2>
      <p class="demo-hint">
        The app's side navigation, a labelled landmark that stays in view and
        scrolls its navigation on its own.
      </p>

      <Card>
        <ul class="layout-notes">
          <li>
            With <code>collapsible</code> a button folds it to a rail of icons.
            The choice is kept in the browser (<code>useAppSidebar()</code>).
          </li>
          <li>
            The app hides it where its menu takes over, with
            <code>--app-sidebar-display: none</code>.
          </li>
          <li>
            The navigation keeps room at its inline end for the scrollbar,
            which macOS and phones draw over the content: without that room it
            would cover the end of the links while the reader scrolls.
          </li>
          <li>
            That room is <code>--app-sidebar-scrollbar-room</code>, 0.75rem by
            default, and a minimum: an app whose
            <code>--app-sidebar-padding-inline</code> is at least as wide
            already has it and sees no change.
          </li>
          <li>
            The collapsed rail hides its scrollbar, so it keeps its own padding
            and its icons stay centered.
          </li>
        </ul>

        <div class="sidebar-demo">
          <AppSidebar id="demo-sidebar" label="Demo sidebar" collapsible>
            <template #header>
              <CardanLogo decorative />
            </template>

            <MenuList
              :list="demoNav"
              button-variant="sidebar"
              aria-label="Demo navigation"
            />
          </AppSidebar>

          <p class="sidebar-demo-page">The page</p>
        </div>

        <MarkdownPreview :content="sidebarExample" class="layout-demo-code" />
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="layout-sidebar-layout">
      <h2 id="layout-sidebar-layout">SidebarLayout</h2>
      <p class="demo-hint">
        A page in two columns: the main content and a side panel. Scroll this
        page to see the sticky panel below scroll on its own, from 1280px wide.
      </p>

      <ul class="layout-notes">
        <li>
          The panel sits beside the main content from <code>beside</code>
          (<code>md</code>, <code>lg</code> or <code>xl</code>, or a boolean the
          app works out itself). Below that width they stack.
        </li>
        <li>
          It follows the main content in the document, or comes first with
          <code>side="start"</code>.
        </li>
        <li>
          With <code>sticky</code> it stays in view under the header and
          scrolls on its own when it is taller than the viewport.
        </li>
        <li>
          The page's spacing above and below is each column's own
          (<code>--sidebar-layout-padding-start</code> and
          <code>--sidebar-layout-padding-end</code>), so the panel runs down to
          the end of the page instead of being cut off above a wrapper's
          padding.
        </li>
      </ul>

      <MarkdownPreview :content="layoutExample" class="layout-demo-code" />

      <SidebarLayout sticky beside="xl" class="layout-demo">
        <Card v-for="section in sections" :key="section">
          <h3>{{ section }}</h3>

          <p>
            Information and user interface components must be presentable to
            users in ways they can perceive, operate and understand, in a wide
            variety of user agents, including assistive technologies.
          </p>
        </Card>

        <template #side>
          <aside aria-label="Filters" class="layout-demo-side">
            <Card class="layout-demo-filters">
              <h3>Filters</h3>

              <Input v-model="search" label="Search" type="search" />

              <Switch v-model="onlyOpen" label="Only open findings" />
            </Card>

            <Card>
              <h3>On this page</h3>

              <ul role="list">
                <li v-for="section in sections" :key="section">
                  <Button variant="link" :label="section" to="#" />
                </li>
              </ul>
            </Card>
          </aside>
        </template>
      </SidebarLayout>
    </section>

    <section class="demo-section" aria-labelledby="layout-side-label">
      <h2 id="layout-side-label">A panel of text alone</h2>
      <p class="demo-hint">
        A panel with nothing focusable in it, such as an order summary, takes
        <code>side-label</code>. Below, from 1024px wide, Tab reaches the order
        and End scrolls it to the total.
      </p>

      <ul class="layout-notes">
        <li>
          The panel is then an <code>aside</code> with that name. Its content
          brings no landmark of its own.
        </li>
        <li>
          While it scrolls it is in the tab order itself: Safari does not focus
          a scroll container on its own, so without it the end of the order
          would be out of reach of the keyboard.
        </li>
        <li>
          On a screen tall enough for the whole order, the panel is no tab
          stop.
        </li>
      </ul>

      <MarkdownPreview :content="orderExample" class="layout-demo-code" />

      <SidebarLayout sticky side-label="Your order" class="layout-demo">
        <Card>
          <h3>Payment</h3>

          <p>
            You pay with iDEAL, a credit card or Bancontact on the next page.
            The invoice reaches you by email once the payment is in.
          </p>
        </Card>

        <template #side>
          <Card class="layout-demo-order">
            <h3>Your order</h3>

            <dl>
              <div v-for="line in orderLines" :key="line.title">
                <dt>{{ line.title }}</dt>
                <dd>{{ line.price }}</dd>
              </div>

              <div class="layout-demo-total">
                <dt>Total</dt>
                <dd>{{ orderTotal }}</dd>
              </div>
            </dl>
          </Card>
        </template>
      </SidebarLayout>
    </section>
  </div>
</template>

<style>
main:has(.layout-page) {
  padding-block-end: 0;
}

.layout-page {
  padding-block-end: 0;

  .demo-section > .card {
    margin-block-end: 0;
  }

  .layout-notes {
    margin-block: 0 1.5rem;
  }

  .layout-demo-code {
    margin-block-start: 1rem;

    pre {
      word-break: normal;
    }
  }

  .sidebar-demo {
    --app-sidebar-display: grid;
    --app-sidebar-width: 16.25rem;
    --app-sidebar-padding-inline: 0.75rem;
    --app-sidebar-padding-block: 0.75rem;
    --app-sidebar-border-color: var(--color-grey-light);

    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    margin-block: 1.5rem;
    border: 1px solid var(--color-grey-light);
    border-radius: var(--radius-md);
    overflow: clip;

    .app-sidebar {
      position: relative;
      top: auto;
      height: 22rem;
    }

    /* Folded to its symbol by a clip, so it does not shrink or jump */
    .cardan-logo {
      flex-shrink: 0;
      transform: translateX(calc((2rem - var(--logo-height)) / 2));
      clip-path: inset(0);
      transition: clip-path var(--duration-lg);
    }

    .is-collapsed .cardan-logo {
      clip-path: inset(0 calc(100% - var(--logo-height)) 0 0);
    }

    .menu-list-nav {
      margin-block-start: 2.5rem;
    }

    /* Icons as wide as the fold button, to line up in the rail */
    .button-variant--sidebar {
      gap: 0.25rem;

      .iconify {
        inline-size: 2rem;
        /* The button's own border */
        margin-inline-start: -1px;
      }
    }

    .sidebar-demo-page {
      margin: 0;
      padding: 1.5rem;
      color: var(--color-grey-text);
    }
  }

  .layout-demo {
    --sidebar-layout-side-width: 18rem;
    --sidebar-layout-padding-start: 1.5rem;
    --sidebar-layout-padding-end: 5rem;

    margin-block-start: 1.5rem;

    > .sidebar-layout-main > .card:last-child {
      margin-block-end: 0;
    }
  }

  .layout-demo-order {
    margin-block-end: 0;

    dl {
      display: grid;
      gap: 0.5rem;
      margin: 0;
    }

    dl > div {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }

    dd {
      margin: 0;
    }

    .layout-demo-total {
      padding-block-start: 0.5rem;
      border-block-start: 1px solid var(--color-grey-light);
      font-weight: var(--font-weight-bold);
    }
  }

  .layout-demo-side {
    display: grid;
    gap: 1rem;

    .card {
      margin-block-end: 0;
    }

    ul {
      display: grid;
      gap: 0.5rem;
    }
  }

  .layout-demo-filters {
    display: grid;
    gap: 1rem;

    h3 {
      margin: 0;
    }
  }
}
</style>
